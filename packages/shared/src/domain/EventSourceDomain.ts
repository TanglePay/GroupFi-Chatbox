import { Inject, Singleton } from "typescript-ioc";
import { EventGroupMemberChanged, EventItemFromFacade, IMessage, ImInboxEventTypeGroupMemberChanged, ImInboxEventTypeNewMessage } from 'iotacat-sdk-core'
import EventEmitter from "events";

import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MessageInitStatus } from './MesssageAggregateRootDomain'

import { GroupFiService } from "../service/GroupFiService";
import { ICommandBase, ICycle, IRunnable } from "../types";
import { IContext, Thread, ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
import { MessageResponseItem } from 'iotacat-sdk-core'
import { IConversationDomainCmdTrySplit } from "./ConversationDomain";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain

const EventEventSourceStartListeningPushService = 'EventSourceDomain.startListeningPushService'
const anchorKey = 'EventSourceDomain.anchor';
const pendingMessageListKey = 'EventSourceDomain.pendingMessageList' 
const pendingMessageGroupIdsSetKey = 'EventSourceDomain.pendingMessageGroupIdsList'

const ConsumedLatestMessageNumPerTime = 1

@Singleton
export class EventSourceDomain implements ICycle,IRunnable{
    
    
    private anchor: string;

    @Inject
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private groupFiService: GroupFiService;

    private _conversationDomainCmdChannel: Channel<ICommandBase<any>>
    set conversationDomainCmdChannel(channel: Channel<ICommandBase<any>>) {
        this._conversationDomainCmdChannel = channel
    }
    private _events: EventEmitter = new EventEmitter();
    private _outChannel: Channel<IMessage>;
    private _outChannelToGroupMemberDomain: Channel<EventGroupMemberChanged>;
    private _lastCatchUpFromApiHasNoDataTime: number = 0
    
    private _pendingMessageList: MessageResponseItem[] = []
    private _pendingMessageGroupIdsSet: Set<string> = new Set<string>()
    async _loadPendingMessageList() {
        const pendingMessageList = await this.localStorageRepository.get(pendingMessageListKey)
        if(pendingMessageList !== null) {
            this._pendingMessageList = JSON.parse(pendingMessageList)
        }
    }
    async _loadPendingMessageGroupIdsSet() {
        const pendingMessageGroupIdsSet = await this.localStorageRepository.get(pendingMessageGroupIdsSetKey)
        if(pendingMessageGroupIdsSet !== null) {
            this._pendingMessageGroupIdsSet = new Set(JSON.parse(pendingMessageGroupIdsSet))
        }
    }
    async _tryPersistPendingMessageList() {
        if(this._pendingListAdded) {
            this._removeDuplicatedPendingMessage()
            await this._persistPendingMessageList()
            this._pendingListAdded = false
        }
    }
    async _persistPendingMessageGroupIdsSet() {
        await this.localStorageRepository.set(pendingMessageGroupIdsSetKey, JSON.stringify(Array.from(this._pendingMessageGroupIdsSet)))
    }
    _lastPersistPendingMessageListTime = 0
    async _persistPendingMessageList() {
        this._lastPersistPendingMessageListTime = Date.now()
        await this.localStorageRepository.set(pendingMessageListKey, JSON.stringify(this._pendingMessageList))
    }
    // remove duplicated pending message
    _removeDuplicatedPendingMessage() {
        const hash = {} as {[key: string]: number}
        this._pendingMessageList = this._pendingMessageList.filter((item) => {
            // item that already in hash will be filtered
            if(hash[item.outputId] === 1) {
                return false
            }
            hash[item.outputId] = 1
            return true
        })
    }

    get outChannel() {
        return this._outChannel;
    }
    get outChannelToGroupMemberDomain() {
        return this._outChannelToGroupMemberDomain;
    }
    private threadHandler: ThreadHandler;
    async bootstrap() {        
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'EventSourceDomain', 1000);
        this._outChannel = new Channel<IMessage>();
        this._outChannelToGroupMemberDomain = new Channel<EventGroupMemberChanged>();
        const anchor = await this.localStorageRepository.get(anchorKey);
        if (anchor) {
            this.anchor = anchor;
        }
        await this._loadPendingMessageList()
        // log EventSourceDomain bootstraped
        console.log('EventSourceDomain bootstraped');
    }
    async start() {
        this.threadHandler.start();
        // log EventSourceDomain started
        console.log('EventSourceDomain started');
    }

    async resume() {
        this.threadHandler.resume();
        // log EventSourceDomain resumed
        console.log('EventSourceDomain resumed');
    }

    async pause() {
        this.stopListenningNewMessage();
        this.threadHandler.pause();
        // log EventSourceDomain paused
        console.log('EventSourceDomain paused');
    }

    async stop() {
        this.threadHandler.stop();
        // log EventSourceDomain stopped
        console.log('EventSourceDomain stopped');
    }

    async destroy() {
        this.threadHandler.destroy();
        // log EventSourceDomain destroyed
        console.log('EventSourceDomain destroyed');
    }
    
    async poll(): Promise<boolean> {
        const catchUpFromApiRes =  await this.catchUpFromApi();
        if (!catchUpFromApiRes) return false;
        const consumePendingRes = await this._consumeMessageFromPending()
        if(!consumePendingRes) return false
        return true;
    }
    
    async _updateAnchor(anchor: string) {
        await this._tryPersistPendingMessageList()
        this.anchor = anchor;
        await this.localStorageRepository.set(anchorKey, anchor);
    }
    private _waitIntervalAfterPush = 3000;
    async handleIncommingMessage(messages: IMessage[], isFromPush: boolean) {
        for (const message of messages) {
            this._outChannel.push(message);
        }
        
        if (isFromPush) {
            setTimeout(() => {
                this.threadHandler.forcePauseResolve()
            }, this._waitIntervalAfterPush);
        }
    }

    handleIncommingEvent(events: EventGroupMemberChanged[]) {
        // log
        console.log('EventSourceDomain handleIncommingEvent', events);
        for (const event of events) {
            this._outChannelToGroupMemberDomain.push(event);
        }
    }

    private _isLoadingFromApi = false;
    private _isStartListenningNewMessage = false;

    private _pendingListAdded = false;
    async catchUpFromApi(): Promise<boolean> {
        if (this._isLoadingFromApi) {
            // log EventSourceDomain catchUpFromApi skip
            console.log('EventSourceDomain catchUpFromApi skip _isLoadingFromApi is true');
            return true;
        }
        // if time elapsed from last catch up is less than 15s, skip
        if((Date.now() - this._lastCatchUpFromApiHasNoDataTime) < 15000) {
            return true;
        }
        this._isLoadingFromApi = true;
        try {
            console.log('****Enter message source domain catchUpFromApi');
            const {itemList,nextToken} = await this.groupFiService.fetchInboxItemsLite(this.anchor);
            console.log('***messageList', itemList,nextToken)
            // const messageList:IMessage[] = [];
            const eventList:EventGroupMemberChanged[] = [];


            for (const item of itemList) {
                if (item.type === ImInboxEventTypeNewMessage) {
                    this._pendingMessageList.push(item)
                    this._pendingListAdded = true
                } else if (item.type === ImInboxEventTypeGroupMemberChanged) {
                    eventList.push(item);
                }
            }


            // await this.handleIncommingMessage(messageList, false);
            this.handleIncommingEvent(eventList);

            if (nextToken) {
                await this._updateAnchor(nextToken);
                return false
            }else {
                this._lastCatchUpFromApiHasNoDataTime = Date.now()
                if (!this._isStartListenningNewMessage) {
                    this.startListenningNewMessage();
                    this._isStartListenningNewMessage = true;
                    this._events.emit(EventEventSourceStartListeningPushService)
                }
                return false
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._isLoadingFromApi = false;
            
        }
        return true;
    }

    async _consumeMessageFromPending() {
        if(this._pendingMessageList.length === 0) {
            return true
        }
        console.log('Consume message from pending', this._pendingMessageList)
        const messagesToBeConsumedLite: MessageResponseItem[] = []
        for (let i = 0; i < ConsumedLatestMessageNumPerTime; i++) {
            const latestMessage = this._pendingMessageList.pop() as MessageResponseItem
            if(latestMessage === undefined) {
                break;
            }
            //const filtered = await this.groupFiService.filterMutedMessage(latestMessage.groupId, latestMessage.sender)
            
            messagesToBeConsumedLite.push(latestMessage)
        }
        const oneMessagesToBeConsumed = await this.groupFiService.fullfillOneMessageLite(messagesToBeConsumedLite[0])
        const messagesToBeConsumed = [oneMessagesToBeConsumed]
        // filter muted message
        const filteredMessagesToBeConsumed = []
        for (const message of messagesToBeConsumed) {
            const filtered = await this.groupFiService.filterMutedMessage(message.groupId, message.sender)
            if (!filtered) {
                filteredMessagesToBeConsumed.push(message)
            }
        }
        // update pending message group ids set
        const groupIdsSize = this._pendingMessageGroupIdsSet.size
        for (const message of filteredMessagesToBeConsumed) {
            this._pendingMessageGroupIdsSet.add(message.groupId)
        }
        // if group ids size changed, persist
        if(groupIdsSize !== this._pendingMessageGroupIdsSet.size) {
            await this._persistPendingMessageGroupIdsSet()
        }
        await this.handleIncommingMessage(filteredMessagesToBeConsumed, false)

        // if no more pending message, persist
        if (this._pendingMessageList.length === 0) {
            await this._persistPendingMessageList()
            // iterate pending message group ids set, and send command to ConversationDomain
            for (const groupId of this._pendingMessageGroupIdsSet) {
                const cmd = {
                    type: 1,
                    groupId
                } as IConversationDomainCmdTrySplit
                this._conversationDomainCmdChannel.push(cmd)
            }
            this._pendingMessageGroupIdsSet.clear()
            await this._persistPendingMessageGroupIdsSet()
        } else if((Date.now() - this._lastPersistPendingMessageListTime) > 3000) {
            await this._persistPendingMessageList()
        }
        return false
    }

    async _storePendingMessageList(messageList: IMessage[]) {
        await this.localStorageRepository.set(pendingMessageListKey, JSON.stringify(messageList))
    }

    isStartListeningPushService() {
        return this._isStartListenningNewMessage
    }

    onEventSourceStartListeningPushService(callback:() => void) {
        this._events.on(EventEventSourceStartListeningPushService, callback)
    }

    offEventSourceStartListeningPushService(callback: () => void) {
        this._events.off(EventEventSourceStartListeningPushService, callback)
    }

    startListenningNewMessage() {
        // log EventSourceDomain startListenningNewMessage
        console.log('EventSourceDomain startListenningNewMessage');
        this.groupFiService.onNewEventItem(this._onNewEventItem.bind(this));
    }
    stopListenningNewMessage() {
        this.groupFiService.offNewEventItem();
    }
    _onNewEventItem(item: EventItemFromFacade) {
        // log EventSourceDomain _onNewMessage
        console.log('EventSourceDomain _onNewEventItem', item);
        if (item.type === ImInboxEventTypeNewMessage) {
            this.handleIncommingMessage([item], true);
        } else if (item.type === ImInboxEventTypeGroupMemberChanged) {
            this.handleIncommingEvent([item]);
        }

    }
}