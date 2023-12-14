import { Inject, Singleton } from "typescript-ioc";
import { EventGroupMemberChanged, EventItemFromFacade, IMessage, ImInboxEventTypeGroupMemberChanged, ImInboxEventTypeNewMessage } from 'iotacat-sdk-core'
import EventEmitter from "events";

import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MessageInitStatus } from './MesssageAggregateRootDomain'

import { GroupFiService } from "../service/GroupFiService";
import { ICycle, IRunnable } from "../types";
import { IContext, Thread, ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain

const EventEventSourceStartListeningPushService = 'EventSourceDomain.startListeningPushService'
const anchorKey = 'EventSourceDomain.anchor';

@Singleton
export class EventSourceDomain implements ICycle,IRunnable{
    
    
    private anchor: string;

    @Inject
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private groupFiService: GroupFiService;

    private _events: EventEmitter = new EventEmitter();
    private _outChannel: Channel<IMessage>;
    private _outChannelToGroupMemberDomain: Channel<EventGroupMemberChanged>;

    
    private _pendingMessageList: IMessage[] = []

    get outChannel() {
        return this._outChannel;
    }
    get outChannelToGroupMemberDomain() {
        return this._outChannelToGroupMemberDomain;
    }
    private threadHandler: ThreadHandler;
    async bootstrap() {        
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'EventSourceDomain', 15000);
        this._outChannel = new Channel<IMessage>();
        this._outChannelToGroupMemberDomain = new Channel<EventGroupMemberChanged>();
        const anchor = await this.localStorageRepository.get(anchorKey);
        if (anchor) {
            this.anchor = anchor;
        }
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
        // log EventSourceDomain poll
        console.log('EventSourceDomain poll');
        return await this.catchUpFromApi();
    }
    
    async _updateAnchor(anchor: string) {
        this.anchor = anchor;
        await this.localStorageRepository.set(anchorKey, anchor);
    }
    private _waitIntervalAfterPush = 3000;
    async handleIncommingMessage(messages: IMessage[], isFromPush: boolean) {
        // for (const message of messages) {
        //     this._outChannel.push(message);
        // }
        
        // 优先处理最新的
        while(messages.length) {
            this._outChannel.push(messages.pop()!)
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
    async catchUpFromApi(): Promise<boolean> {
        if (this._isLoadingFromApi) {
            // log EventSourceDomain catchUpFromApi skip
            console.log('EventSourceDomain catchUpFromApi skip _isLoadingFromApi is true');
            return true;
        }
        this._isLoadingFromApi = true;
        try {
            console.log('****Enter message source domain catchUpFromApi');
            const {itemList,nextToken} = await this.groupFiService.getInboxItems(this.anchor);
            console.log('***messageList', itemList,nextToken)
            // const messageList:IMessage[] = [];
            const eventList:EventGroupMemberChanged[] = [];
            for (const item of itemList) {
                if (item.type === ImInboxEventTypeNewMessage) {
                    this._pendingMessageList.push(item)
                    // messageList.push(item);
                } else if (item.type === ImInboxEventTypeGroupMemberChanged) {
                    eventList.push(item);
                }
            }


            // await this.handleIncommingMessage(messageList, false);
            this.handleIncommingEvent(eventList);
            if (nextToken) {
                await this._updateAnchor(nextToken);
                return false;
            }else if(this._pendingMessageList.length > 0) {
                await this.handleIncommingMessage(this._pendingMessageList, false)
                return false
            } else {
                if (!this._isStartListenningNewMessage) {
                    this.startListenningNewMessage();
                    this._isStartListenningNewMessage = true;
                    this._events.emit(EventEventSourceStartListeningPushService)
                }
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._isLoadingFromApi = false;
            
        }
        return true;
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