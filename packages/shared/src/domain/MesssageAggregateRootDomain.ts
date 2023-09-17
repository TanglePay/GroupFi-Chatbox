import { Inject, Singleton } from "typescript-ioc";
import { ConversationDomain } from "./ConversationDomain";
import { InboxDomain } from "./InboxDomain";
import { MessageHubDomain } from "./MessageHubDomain";
import { MessageSourceDomain } from "./MessageSourceDomain";
import { EventEmitter } from 'events';
// serving as a facade for all message related domain, also in charge of bootstraping
// after bootstraping, each domain should subscribe to the event, then push event into array for buffering, and 
// triggering a handle function call to drain the array when there isn't any such function call in progress
// subscriber should be notified when state is changed, and should be able to retrieve the new state via function call

export type MessageInitStatus = 'uninit' | 'bootstraped' | 'loadedFromStorageWaitApiCallToCatchUp' | 'catchedUpViaApiCallWaitForPushService' | 'startListeningPushService' | 'inited';

@Singleton
export class MessageAggregateRootDomain {

    private _events: EventEmitter = new EventEmitter();

    onNewMessageInitStatus(callback: () => void) {
        this._events.on('newMessageInitStatus', callback);
    }
    private _messageInitStatus: MessageInitStatus = 'uninit';

    get messageInitStatus(): MessageInitStatus {
        return this._messageInitStatus;
    }

    @Inject
    private inboxDomain: InboxDomain;
    @Inject
    private messageSourceDomain: MessageSourceDomain;
    @Inject
    private messageHubDomain: MessageHubDomain;
    @Inject
    private conversationDomain: ConversationDomain;

    bootstrap() {
        setTimeout(this._bootstrap.bind(this), 0);
    }
    // bootstraping
    async _bootstrap() {
        await this.messageSourceDomain.bootstrap();
        await this.messageHubDomain.bootstrap();
        await this.inboxDomain.bootstrap();
        await this.conversationDomain.bootstrap();
        this._messageInitStatus = 'bootstraped';
        this._events.emit('newMessageInitStatus');

        await this.inboxDomain.loadFromLocalStorage();
        this._messageInitStatus = 'loadedFromStorageWaitApiCallToCatchUp';
        this._events.emit('newMessageInitStatus');

        await this.messageSourceDomain.catchUpFromApi();
        this._messageInitStatus = 'catchedUpViaApiCallWaitForPushService';
        this._events.emit('newMessageInitStatus');

        await this.messageSourceDomain.startListenningNewMessage();
        this._messageInitStatus = 'startListeningPushService';
        this._events.emit('newMessageInitStatus');

        await this.messageSourceDomain.catchUpFromApi(); // in case there is new message pushed before startListeningNewMessage and after catchUpFromApi
        this._messageInitStatus = 'inited';
        this._events.emit('newMessageInitStatus');
    }

    getInbox() {
        return this.inboxDomain.getInbox();
    }

}