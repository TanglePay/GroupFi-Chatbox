import { Inject, Singleton } from "typescript-ioc";
import { ConversationDomain } from "./ConversationDomain";
import { InboxDomain } from "./InboxDomain";
import { MessageHubDomain } from "./MessageHubDomain";
import { MessageSourceDomain } from "./MessageSourceDomain";
import { EventEmitter } from 'events';
import { GroupFiService } from "../service/GroupFiService";
import { ICycle } from "../types";
// serving as a facade for all message related domain, also in charge of bootstraping
// after bootstraping, each domain should subscribe to the event, then push event into array for buffering, and 
// triggering a handle function call to drain the array when there isn't any such function call in progress
// subscriber should be notified when state is changed, and should be able to retrieve the new state via function call

export type MessageInitStatus = 'uninit' | 'bootstraped' | 'loadedFromStorageWaitApiCallToCatchUp' | 'catchedUpViaApiCallWaitForPushService' | 'startListeningPushService' | 'inited';

@Singleton
export class MessageAggregateRootDomain implements ICycle{

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
    @Inject
    private groupFiService: GroupFiService;

    private _cycleableDomains: ICycle[]
    async bootstrap() {
        // this._cycleableDomains = [this.messageSourceDomain, this.messageHubDomain, this.conversationDomain, this.inboxDomain];
        // for (const domain of this._cycleableDomains) {
        //     await domain.bootstrap();
        // }
    }
    
    async start(): Promise<void> {
        for (const domain of this._cycleableDomains) {
            await domain.start();
        }
    }
    // resume all domains
    async resume(): Promise<void> {
        for (const domain of this._cycleableDomains) {
            await domain.resume();
        }
    }
    // pause all domains
    async pause(): Promise<void> {
        for (const domain of this._cycleableDomains) {
            await domain.pause();
        }
    }
    // stop all domains
    async stop(): Promise<void> {
        for (const domain of this._cycleableDomains) {
            await domain.stop();
        }
    }
    // destroy all domains
    async destroy(): Promise<void> {
        for (const domain of this._cycleableDomains) {
            await domain.destroy();
        }
    }

    getInbox() {
        return this.inboxDomain.getInbox();
    }

}