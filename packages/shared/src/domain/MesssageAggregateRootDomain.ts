import { Inject, Singleton } from "typescript-ioc";
import { ConversationDomain } from "./ConversationDomain";
import { InboxDomain } from "./InboxDomain";
import { MessageHubDomain } from "./MessageHubDomain";
import { MessageSourceDomain } from "./MessageSourceDomain";

import { ICycle, StorageAdaptor } from "../types";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { GroupFiService } from "../service/GroupFiService";
import { IMMessage, IMessage } from "iotacat-sdk-core";
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
    _switchAddress(address: string) {
        const addressHash = this.groupFiService.sha256Hash(address);
        const storageKeyPrefix = `groupfi.${addressHash}.`;
        this.localStorageRepository.setStorageKeyPrefix(storageKeyPrefix);
    }
    async connectWallet() {
        const {address} = await this.groupFiService.bootstrap();
        this._switchAddress(address);
    }
    async bootstrap() {

        this._cycleableDomains = [this.messageSourceDomain, this.messageHubDomain, this.inboxDomain, this.conversationDomain];
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
    async getInboxList() {
        return await this.inboxDomain.getInbox();
    }
    async getConversationMessageList({groupId,key,startMessageId, untilMessageId,size}:{groupId: string, key?: string, startMessageId?: string, untilMessageId?:string, size?: number}) {
        return await this.conversationDomain.getMessageList({groupId,key,startMessageId, untilMessageId,size});
    }
    async setupGroupFiMqttConnection(connect:any) {
        await this.groupFiService.setupGroupFiMqttConnection(connect);
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
    onInboxLoaded(callback: () => void) {
        this.inboxDomain.onInboxLoaded(callback);
    }
    offInboxLoaded(callback: () => void) {
        this.inboxDomain.offInboxLoaded(callback);
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

    getGroupFiService() {
        return this.groupFiService
    }
    onSentMessage(message:IMessage) {
        this.messageSourceDomain._onNewMessage(message);
    }
}