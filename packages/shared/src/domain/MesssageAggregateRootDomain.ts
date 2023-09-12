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

    private messageInitStatus: MessageInitStatus = 'uninit';

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
        await this.inboxDomain.bootstrap();
        await this.messageSourceDomain.bootstrap();
        await this.messageHubDomain.bootstrap();
        await this.conversationDomain.bootstrap();
        this.messageInitStatus = 'bootstraped';
    }
    // load from local storage
    async loadFromLocalStorage() {
        await this.inboxDomain.loadFromLocalStorage();
        this.messageInitStatus = 'loadedFromStorageWaitApiCallToCatchUp';
    }

    // catch up via api call





}