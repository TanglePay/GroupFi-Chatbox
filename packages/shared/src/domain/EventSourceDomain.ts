import { Inject, Singleton } from "typescript-ioc";
import { EventGroupMemberChanged,EventGroupUpdateMinMaxToken, EventItemFromFacade, IMessage, ImInboxEventTypeGroupMemberChanged, ImInboxEventTypeNewMessage, EventGroupMarkChanged, ImInboxEventTypeMuteChanged, ImInboxEventTypeLikeChanged } from 'iotacat-sdk-core'
import EventEmitter from "events";

import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MessageInitStatus } from './MesssageAggregateRootDomain'

import { GroupFiService } from "../service/GroupFiService";
import { ICommandBase, ICycle, IRunnable } from "../types";
import { IContext, Thread, ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
import { MessageResponseItem, 
    ImInboxEventTypeMarkChanged,
    ImInboxEventTypePairXChanged,
    ImInboxEventTypeDidChangedEvent,
    ImInboxEventTypeEvmQualifyChanged,
    PushedEvent } from 'iotacat-sdk-core'
import { IConversationDomainCmdTrySplit } from "./ConversationDomain";
import { OutputSendingDomain } from "./OutputSendingDomain";
import { ProxyModeDomain } from "./ProxyModeDomain";
import { bytesToHex,objectId } from "iotacat-sdk-utils";
import { SharedContext } from "./SharedContext";
import { is } from "immutable";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain

const anchorKey = 'EventSourceDomain.anchor';
const pendingMessageListKey = 'EventSourceDomain.pendingMessageList' 
const pendingMessageGroupIdsSetKey = 'EventSourceDomain.pendingMessageGroupIdsList'

const ConsumedLatestMessageNumPerTime = 1
/*
export const ImInboxEventTypeMarkChanged = 4
export const ImInboxEventTypeEvmQualifyChanged = 5
export const ImInboxEventTypePairXChanged = 6
export const ImInboxEventTypeDidChangedEvent = 7*/
const InboxApiEvents = [
    ImInboxEventTypeGroupMemberChanged, 
    ImInboxEventTypeMarkChanged,
    ImInboxEventTypePairXChanged,
    ImInboxEventTypeDidChangedEvent,
    ImInboxEventTypeEvmQualifyChanged,
    ImInboxEventTypeMuteChanged,
    ImInboxEventTypeLikeChanged
]
@Singleton
export class EventSourceDomain implements ICycle,IRunnable{
    
    
    private anchor: string | undefined

    @Inject
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private groupFiService: GroupFiService;

    
    private outputSendingDomain: OutputSendingDomain

    @Inject
    private proxyModeDomain: ProxyModeDomain
    setOutputSendingDomain(outputSendingDomain: OutputSendingDomain) {
        this.outputSendingDomain = outputSendingDomain
    }
    private _seenEventIds: Set<string> = new Set<string>();
    
    private _conversationDomainCmdChannel: Channel<ICommandBase<any>>
    set conversationDomainCmdChannel(channel: Channel<ICommandBase<any>>) {
        this._conversationDomainCmdChannel = channel
    }
    private _events: EventEmitter = new EventEmitter();
    private _outChannel: Channel<IMessage>;
    private _outChannelToGroupMemberDomain: Channel<PushedEvent|EventGroupUpdateMinMaxToken>;
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
    private _onTopicChangedHandler: () => void;

    @Inject
    private _context: SharedContext;
    async bootstrap() {        
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'EventSourceDomain', 1000);
        this._outChannel = new Channel<IMessage>();
        this._outChannelToGroupMemberDomain = new Channel<EventGroupMemberChanged>();
        this._onTopicChangedHandler = () => {
            const allGroupIds = this._context.allGroupIds
            let allTopic = [...allGroupIds]
            if (this._context.isWalletConnected) {
                const walletAddress = this._context.walletAddress
                const walletAddressHash = this.groupFiService.sha256Hash(walletAddress)
                allTopic = [...allTopic, walletAddressHash]
            }
            // log EventSourceDomain syncAllTopics
            console.log('EventSourceDomain _onTopicChangedHandler', allGroupIds, allTopic);
            const prefixedAllTopic = allTopic.map((topic) => {
                return `inbox/${topic}`
            })
            this.groupFiService.syncAllTopics(prefixedAllTopic)
        }
        console.log('EventSourceDomain bootstraped');
    }
    async start() {
        this.registerMessageConsumedCallback()
        this.switchAddress()
        this.threadHandler.start();
        // log EventSourceDomain started
        console.log('EventSourceDomain started');
    }

    async resume() {
        this._context.onAllGroupIdsChanged(this._onTopicChangedHandler.bind(this))
        this._context.onWalletAddressChanged(this._onTopicChangedHandler.bind(this))
        this._onTopicChangedHandler()
        this.threadHandler.resume();
        // log EventSourceDomain resumed
        console.log('EventSourceDomain resumed');
    }

    async pause() {
        this.stopListenningNewMessage();
        this.groupFiService.unsubscribeToAllTopics()
        this._context.offAllGroupIdsChanged(this._onTopicChangedHandler.bind(this))
        this._context.offWalletAddressChanged(this._onTopicChangedHandler.bind(this))
        this._isStartListenningNewMessage = false
        this.threadHandler.pause();
        // log EventSourceDomain paused
        console.log('EventSourceDomain paused');
    }

    async stop() {
        this.threadHandler.stop();
        this._pendingMessageList = []
        this._lastCatchUpFromApiHasNoDataTime = 0
        this._pendingMessageGroupIdsSet.clear()
        this._seenEventIds.clear()

        this.anchor = undefined
        

        // log EventSourceDomain stopped
        console.log('EventSourceDomain stopped');
    }

    async destroy() {
        this.threadHandler.destroy();
        // log EventSourceDomain destroyed
        console.log('EventSourceDomain destroyed');
    }
    
    async poll(): Promise<boolean> {
        const isCatchUpFromApi =  await this.catchUpFromApi();
        if (isCatchUpFromApi) return false;
        // _processMessageToBeConsumed
        const processMessageToBeConsumedRes = await this._processMessageToBeConsumed();
        if (!processMessageToBeConsumedRes) return false;
        const consumePendingRes = await this._consumeMessageFromPending()
        if(!consumePendingRes) return false
        return true;
    }
    
    async _updateAnchor(anchor: string) {
        await this._tryPersistPendingMessageList()
        this.anchor = anchor;
        await this.localStorageRepository.set(anchorKey, anchor);
    }
    private _waitIntervalAfterPush = 0;
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

    handleIncommingEvent(events: PushedEvent[]) {
        if (!events || events.length === 0) return;
        // log
        console.log('EventSourceDomain handleIncommingEvent', events);
        for (const event of events) {
            const eventId = bytesToHex(objectId(event));
            if (this._seenEventIds.has(eventId)) {
                return false;
            }
            this._seenEventIds.add(eventId);
            const {type} = event
            if ([
                ImInboxEventTypeGroupMemberChanged, 
                ImInboxEventTypeMarkChanged,
                ImInboxEventTypeMuteChanged,
                ImInboxEventTypeLikeChanged,
                ImInboxEventTypeEvmQualifyChanged
            ].includes(type)) {
                this._outChannelToGroupMemberDomain.push(event)
            } else if (type === ImInboxEventTypePairXChanged) {
                console.log('ImInboxEventTypePairXChanged event from catchUpFromApi', event)
                this.proxyModeDomain.pairXChanged()
            } else if (type === ImInboxEventTypeDidChangedEvent) {
                console.log('ImInboxEventTypeDidChangedEvent event from catchUpFromApi', event)
                this.outputSendingDomain.didChanged()
            }
        }
    }
    handleGroupMinMaxTokenUpdate(groupId: string, {min,max}: {min?:string,max?:string}) {
        const event = {
            groupId,
            min,max
        } as EventGroupUpdateMinMaxToken
        this._outChannelToGroupMemberDomain.push(event)
    }
    

    private _isLoadingFromApi = false;
    private _isStartListenningNewMessage = false;

    private _pendingListAdded = false;
    // add pending message
    addPendingMessageToFront(oldToNew: MessageResponseItem[]) {
        this._pendingMessageList.push(...oldToNew)
        this._removeDuplicatedPendingMessage()
        this._pendingListAdded = true
    }
    // isCan catch up from api
    isCanCatchUpFromApi() {
        return this._context.isLoggedIn
    }
    // isshould catch up from api
    isShouldCatchUpFromApi() {
        if((Date.now() - this._lastCatchUpFromApiHasNoDataTime) > 4000) {
            return true;
        }
        return false
    }
    // try catch up from api, return is did something
    async catchUpFromApi() {
        const isCanCatchUpFromApi = this.isCanCatchUpFromApi()
        const isShouldCatchUpFromApi = this.isShouldCatchUpFromApi()
        if (isCanCatchUpFromApi && isShouldCatchUpFromApi) {
            return await this.actualCatchUpFromApi()
        }
        return false
    } 
    async actualCatchUpFromApi() {
        let isDidSomething = false;
        if (this._isLoadingFromApi) {
            // log EventSourceDomain catchUpFromApi skip
            console.log('EventSourceDomain catchUpFromApi skip _isLoadingFromApi is true');
            return isDidSomething;
        }
        this._isLoadingFromApi = true;

        try {
            console.log('catchUpFromApi anchor', this.anchor);
            const {itemList,nextToken} = await this.groupFiService.fetchInboxItemsLite(this.anchor);
            isDidSomething = true;
            console.log('catchUpFromApi messageList', itemList, nextToken)
            // const messageList:IMessage[] = [];
            const eventList:PushedEvent[] = [];


            for (const item of itemList) {
                if (item.type === ImInboxEventTypeNewMessage) {
                    this._pendingMessageList.push(item)
                    this._pendingListAdded = true
                } else if (InboxApiEvents.includes(item.type)) {
                    eventList.push(item);
                }
            }


            // await this.handleIncommingMessage(messageList, false);
            this.handleIncommingEvent(eventList);

            if (nextToken) {
                
                await this._updateAnchor(nextToken);
                this._lastCatchUpFromApiHasNoDataTime = 0
            }else {
                this._lastCatchUpFromApiHasNoDataTime = Date.now()
                if (!this._isStartListenningNewMessage) {
                    this.startListenningNewMessage();
                    this._isStartListenningNewMessage = true;
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._isLoadingFromApi = false;
            
        }
        return isDidSomething;
    }

    _outputIdInPipe = new Set<string>()
    async _consumeMessageFromPending() {
        if(this._pendingMessageList.length === 0) {
            return true
        }
        console.log('Consume message from pending', this._pendingMessageList)
        // find first message that is not in pipe, and add to pipe, from the end of pending message list
        for (let i = this._pendingMessageList.length - 1; i >= 0; i--) {
            const message = this._pendingMessageList[i]
            if(!this._outputIdInPipe.has(message.outputId)) {
                this._outputIdInPipe.add(message.outputId)
                const isInserted = this.groupFiService.processOneMessage(message)
                if (!isInserted) return true;
            }
        }
        return true
    }
    // register callback to be called when new message is consumed
    registerMessageConsumedCallback() {
        const callback = (param:{message?:IMessage,outputId:string,status:number})=>{
            if (param.status == 0) {
                const {groupId, token}= param.message!
                // log
                console.log('EventSourceDomain registerMessageConsumedCallback handleGroupMinMaxTokenUpdate');
                this.handleGroupMinMaxTokenUpdate(groupId, {min:token,max:token})
            }
            this._messageToBeConsumed.push(param)
        }

        this.groupFiService.registerMessageCallback(callback)
    }
    _messageToBeConsumed: {message?:IMessage,outputId:string,status:number}[] = []
    // process message to be consumed
    async _processMessageToBeConsumed() {
        if(this._messageToBeConsumed.length === 0) {
            return true
        }
        const payload = this._messageToBeConsumed.pop()
        if(payload === undefined) {
            return true
        }
        // log
        // console.log('EventSourceDomain _processMessageToBeConsumed', payload);
        const {message,outputId, status} = payload
        // filter muted message
        const filteredMessagesToBeConsumed = []
        if (message) {
            const isWalletConnected = this._context.isWalletConnected
            const filtered = isWalletConnected && await this.groupFiService.filterMutedMessage(message.groupId, message.sender)
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
        // remove message from pending
        this._removeMessageFromPending(outputId)
        // remove output id from pipe
        this._outputIdInPipe.delete(outputId)
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
    _removeMessageFromPending(outputId: string) {
        this._pendingMessageList = this._pendingMessageList.filter((item) => {
            return item.outputId !== outputId
        })
    }
    async switchAddress() {
        try{

            const [anchor] = await Promise.all([
                this.localStorageRepository.get(anchorKey), 
                this._loadPendingMessageList(), 
                this._loadPendingMessageGroupIdsSet()
            ])
            if(anchor) {
                this.anchor = anchor
            }
        }catch(error) {
            console.log('EventSourceDomain switch address error:', error)
        }
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
        } else if (item.type === ImInboxEventTypeMarkChanged) {
            this.handleIncommingEvent([item])
        } else if ([ImInboxEventTypeMuteChanged, ImInboxEventTypeLikeChanged].includes(item.type)) {
            this.handleIncommingEvent([item])
        }

    }

}