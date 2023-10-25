import { Inject, Singleton } from "typescript-ioc";
import { ConversationDomain } from "./ConversationDomain";
import { InboxDomain } from "./InboxDomain";
import { MessageHubDomain } from "./MessageHubDomain";
import { MessageSourceDomain } from "./MessageSourceDomain";

import { ICycle, StorageAdaptor } from "../types";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { GroupFiService } from "../service/GroupFiService";
// serving as a facade for all message related domain, also in charge of bootstraping
// after bootstraping, each domain should subscribe to the event, then push event into array for buffering, and 
// triggering a handle function call to drain the array when there isn't any such function call in progress
// subscriber should be notified when state is changed, and should be able to retrieve the new state via function call

export type MessageInitStatus = 'uninit' | 'bootstraped' | 'loadedFromStorageWaitApiCallToCatchUp' | 'catchedUpViaApiCallWaitForPushService' | 'startListeningPushService' | 'inited';

@Singleton
export class MessageAggregateRootDomain implements ICycle{


    @Inject
    private inboxDomain: InboxDomain;
    @Inject
    private messageSourceDomain: MessageSourceDomain;
    @Inject
    private messageHubDomain: MessageHubDomain;
    @Inject
    private conversationDomain: ConversationDomain;
    @Inject
    private localStorageRepository: LocalStorageRepository;
    // inject groupfi service
    @Inject
    private groupFiService: GroupFiService;

    private _cycleableDomains: ICycle[]
    setStorageAdaptor(storageAdaptor: StorageAdaptor) {
        this.localStorageRepository.setStorageAdaptor(storageAdaptor);
    }
    async connectWallet() {
        await this.groupFiService.bootstrap();
    }
    async bootstrap() {

        this._cycleableDomains = [this.messageSourceDomain, this.messageHubDomain, this.inboxDomain] //, this.conversationDomain];
        for (const domain of this._cycleableDomains) {
            await domain.bootstrap();
        }
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
    onInboxReady(callback: () => void) {
        this.inboxDomain.onInboxReady(callback);
    }
    offInboxReady(callback: () => void) {
        this.inboxDomain.offInboxReady(callback);
    }
    onInboxDataChanged(callback: () => void) {
        this.inboxDomain.onInboxUpdated(callback);
    }
    offInboxDataChanged(callback: () => void) {
        this.inboxDomain.offInboxUpdated(callback);
    }
    onConversationDataChanged(groupId: string, callback: () => void) {
        this.conversationDomain.onGroupDataUpdated(groupId, callback);
    }
    offConversationDataChanged(groupId: string, callback: () => void) {
        this.conversationDomain.offGroupDataUpdated(groupId, callback);
    }
    getInbox() {
        return this.inboxDomain.getInbox();
    }

}