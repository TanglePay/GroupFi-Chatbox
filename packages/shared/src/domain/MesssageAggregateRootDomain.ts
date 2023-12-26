import { Inject, Singleton } from "typescript-ioc";
import { ConversationDomain, MessageFetchDirection } from "./ConversationDomain";
import { InboxDomain } from "./InboxDomain";
import { MessageHubDomain } from "./MessageHubDomain";
import { EventSourceDomain } from "./EventSourceDomain";

import { ICycle, StorageAdaptor } from "../types";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { GroupFiService } from "../service/GroupFiService";
import { IMMessage, IMessage } from "iotacat-sdk-core";
import { EventItemFromFacade } from "iotacat-sdk-core";
import { EventGroupMemberChangedKey, EventGroupMemberChangedLiteKey, GroupMemberDomain } from "./GroupMemberDomain";
import { AquiringPublicKeyEventKey, NotEnoughCashTokenEventKey, OutputSendingDomain, PublicKeyChangedEventKey } from "./OutputSendingDomain";
// serving as a facade for all message related domain, also in charge of bootstraping
// after bootstraping, each domain should subscribe to the event, then push event into array for buffering, and 
// triggering a handle function call to drain the array when there isn't any such function call in progress
// subscriber should be notified when state is changed, and should be able to retrieve the new state via function call

export type MessageInitStatus = 'uninit' | 'bootstraped' | 'loadedFromStorageWaitApiCallToCatchUp' | 'catchedUpViaApiCallWaitForPushService' | 'startListeningPushService' | 'inited';

export {HeadKey} from './ConversationDomain'
@Singleton
export class MessageAggregateRootDomain implements ICycle{


    @Inject
    private inboxDomain: InboxDomain;
    @Inject
    private eventSourceDomain: EventSourceDomain;
    @Inject
    private messageHubDomain: MessageHubDomain;
    @Inject
    private conversationDomain: ConversationDomain;
    @Inject
    private groupMemberDomain: GroupMemberDomain;
    @Inject
    private outputSendingDomain: OutputSendingDomain;
    @Inject
    private localStorageRepository: LocalStorageRepository;
    // inject groupfi service
    @Inject
    private groupFiService: GroupFiService;
    
    private _messageInitStatus: MessageInitStatus = 'uninit'

    private _cycleableDomains: ICycle[]
    setStorageAdaptor(storageAdaptor: StorageAdaptor) {
        this.localStorageRepository.setStorageAdaptor(storageAdaptor);
    }
    _switchAddress(address: string) {
        const addressHash = this.groupFiService.sha256Hash(address);
        const storageKeyPrefix = `groupfi.2.${addressHash}.`;
        this.localStorageRepository.setStorageKeyPrefix(storageKeyPrefix);
        this.messageHubDomain.cacheClear();
        this.inboxDomain.cacheClear();
        this.conversationDomain.cacheClear();
        this.groupMemberDomain.cacheClear();
        this.outputSendingDomain.cacheClear();

        this.inboxDomain.switchAddress()
    }
    async connectWallet() {
        const {address} = await this.groupFiService.bootstrap();
        this._switchAddress(address);
        return address
    }
    async bootstrap() {
        console.log(this.groupMemberDomain)
        this._cycleableDomains = [this.outputSendingDomain, this.eventSourceDomain, this.messageHubDomain, this.inboxDomain, this.conversationDomain, this.groupMemberDomain];
        //this._cycleableDomains = [this.eventSourceDomain, this.messageHubDomain, this.inboxDomain]
        for (const domain of this._cycleableDomains) {
            await domain.bootstrap();
        }
    }
    _groupMemberChangedCallback: (param:{groupId: string,isNewMember:boolean,addressSha256Hash:string}) => void
    async joinGroup(groupId:string){
        this.outputSendingDomain.joinGroup(groupId)
        return new Promise((resolve,reject)=>{
            this._groupMemberChangedCallback = ({groupId:groupIdFromEvent,isNewMember,addressSha256Hash}:{groupId:string,isNewMember:boolean,addressSha256Hash:string}) => {
                // log event key and params
                console.log(EventGroupMemberChangedLiteKey,{groupId:groupIdFromEvent,isNewMember,addressSha256Hash})

                const fn = async () => {
                    if(groupIdFromEvent === groupId && isNewMember) {
                        const currentAddress = this.groupFiService.getCurrentAddress()
                        const currentAddressHash = this.groupFiService.sha256Hash(currentAddress)
                        // log both address hash in one line
                        console.log('currentAddressHash',currentAddressHash,'addressSha256Hash',addressSha256Hash)

                        if (this.groupFiService.addHexPrefixIfAbsent(currentAddressHash) === this.groupFiService.addHexPrefixIfAbsent(addressSha256Hash)) {
                            this.groupMemberDomain.off(EventGroupMemberChangedLiteKey,this._groupMemberChangedCallback)
                            resolve({})
                        }
                    }
                }
                fn()
            }
            this.groupMemberDomain.on(EventGroupMemberChangedLiteKey,this._groupMemberChangedCallback)
        })
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
    async getConversationMessageList({groupId,key,messageId, direction,size}:{groupId: string, key: string, messageId?:string,direction:MessageFetchDirection, size?: number}): Promise<{
        messages: IMessage[],
        directionMostMessageId?: string,
        chunkKeyForDirectMostMessageId: string
    }> {
        return await this.conversationDomain.getMessageList({groupId,key,messageId,direction,size})
    }
    async setupGroupFiMqttConnection(connect:any) {
        await this.groupFiService.setupGroupFiMqttConnection(connect);
    }
    getIsHasPublicKey() {
        return this.outputSendingDomain.isHasPublicKey
    }
    
    onIsHasPublicKeyChanged(callback: (param:{isHasPublicKey: boolean}) => void) {
        this.outputSendingDomain.on(PublicKeyChangedEventKey,callback)
    }

    onIsHasPublicKeyChangedOnce(callback: (param:{isHasPublicKey: boolean}) => void) {
        this.outputSendingDomain.once(PublicKeyChangedEventKey,callback)
        return () => this.outputSendingDomain.off(PublicKeyChangedEventKey, callback)
    }
    offIsHasPublicKeyChanged(callback: (param:{isHasPublicKey: boolean}) => void) {
        this.outputSendingDomain.off(PublicKeyChangedEventKey,callback)
    }
    onNotEnoughCashToken(callback: () => void) {
        this.outputSendingDomain.on(NotEnoughCashTokenEventKey,callback)
    }
    offNotEnoughCashToken(callback: () => void) {
        this.outputSendingDomain.off(NotEnoughCashTokenEventKey,callback)
    }
    onAquiringPublicKeyOnce(callback: () => void) {
        this.outputSendingDomain.once(AquiringPublicKeyEventKey,callback)
        return () => this.outputSendingDomain.off(AquiringPublicKeyEventKey, callback)
    }
    offAquiringPublicKey(callback: () => void) {
        this.outputSendingDomain.off(AquiringPublicKeyEventKey,callback)
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
    async clearUnreadCount(groupId: string) {
        this.inboxDomain.clearUnreadCount(groupId)
    }
    async setUnreadCount(groupId: string, unreadCount: number, lastTimeReadLatestMessageTimestamp: number) {
        this.inboxDomain.setUnreadCount(groupId, unreadCount, lastTimeReadLatestMessageTimestamp)
    }
    async enteringGroupByGroupId(groupId: string) {
        this.groupMemberDomain._refreshGroupMember(groupId)
    }
    getGroupFiService() {
        return this.groupFiService
    }
    
    isEventSourceDomainStartListeningPushService() {
        return this.eventSourceDomain.isStartListeningPushService()
    }

    onEventSourceDomainStartListeningPushService(callback: () => void) {
        this.eventSourceDomain.onEventSourceStartListeningPushService(callback)
    }

    offEventSourceDomainStartListeningPushService(callback: () => void) {
        this.eventSourceDomain.offEventSourceStartListeningPushService(callback)
    }

    // Check cash token
    getIsHasEnoughCashToken() {
        return this.outputSendingDomain.isHasEnoughCashToken
    }

    onHasEnoughCashTokenOnce(callback: () => void) {
        return this.outputSendingDomain.onHasEnoughCashTokenOnce(callback)
    }

    onNotHasEnoughCashTokenOnce(callback: () => void) {
        return this.outputSendingDomain.onNotHasEnoughCashTokenOnce(callback)   
    }

    onSentMessage(message:EventItemFromFacade) {
        console.log('**From sdk call')
        this.eventSourceDomain._onNewEventItem(message);
    }
    listenningAccountChanged(callback: (newAddress: string) => void) {
        return this.groupFiService.listenningAccountChanged((address) => {
            callback(address)
            this._switchAddress(address)
        })
    }
}