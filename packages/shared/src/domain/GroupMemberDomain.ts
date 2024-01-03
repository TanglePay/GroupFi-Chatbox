import { Inject, Singleton } from "typescript-ioc";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { ICycle, IRunnable } from "../types";
import { ThreadHandler } from "../util/thread";
import { LRUCache } from "../util/lru";
import { GroupFiService } from "../service/GroupFiService";
import { EventGroupMemberChanged } from "iotacat-sdk-core";
import { objectId, bytesToHex } from "iotacat-sdk-utils";
import { Channel } from "../util/channel";
import { EventSourceDomain } from "./EventSourceDomain";
import EventEmitter from "events";
export interface IGroupMember {
    groupId: string;
    memberAddressList: {addr:string,publicKey:string}[];
}
export const EventGroupMemberChangedKey = 'GroupMemberDomain.groupMemberChanged';
export const EventGroupMemberChangedLiteKey = 'GroupMemberDomain.groupMemberChangedLite';
@Singleton
export class GroupMemberDomain implements ICycle, IRunnable {
    private _lruCache: LRUCache<IGroupMember>;
    private _processingGroupIds: Map<string,NodeJS.Timeout>;
    private _inChannel: Channel<EventGroupMemberChanged>;


    @Inject
    private eventSourceDomain: EventSourceDomain;
    @Inject
    private groupFiService: GroupFiService;

    private _events: EventEmitter = new EventEmitter();
    private _seenEventIds: Set<string> = new Set<string>();
    cacheClear() {
        if (this._lruCache) {
            this._lruCache.clear();
        }
        if (this._processingGroupIds) {
            // clear all pending refresh
            for (const timeoutHandle of this._processingGroupIds.values()) {
                clearTimeout(timeoutHandle);
            }
            this._processingGroupIds.clear();
        }
        if (this._seenEventIds) {
            this._seenEventIds.clear();
        }
    }
    async bootstrap(): Promise<void> {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'GroupMemberDomain', 1000);
        this._lruCache = new LRUCache<IGroupMember>(100);
        this._processingGroupIds = new Map<string,NodeJS.Timeout>();
        this._inChannel = this.eventSourceDomain.outChannelToGroupMemberDomain;
        // log
        console.log('GroupMemberDomain bootstraped');
    }
    @Inject
    private combinedStorageService: CombinedStorageService;

    private threadHandler: ThreadHandler;
    async start() {
        this.threadHandler.start();
        // log
        console.log('GroupMemberDomain started');
    }

    async resume() {
        this.threadHandler.resume();
    }

    async pause() {
        this.threadHandler.pause();
    }

    async stop() {
        this.threadHandler.stop();
    }

    async destroy() {
        this.threadHandler.destroy();
        this.cacheClear();
        //@ts-ignore
        this._lruCache = undefined;
        //@ts-ignore
        this._processingGroupIds = undefined;
    }

    async poll(): Promise<boolean> {
        const event = this._inChannel.poll();
        if (event) {
            // log
            console.log(`GroupMemberDomain poll ${JSON.stringify(event)}`);
            const eventId = bytesToHex(objectId(event));
            if (this._seenEventIds.has(eventId)) {
                return false;
            }
            this._seenEventIds.add(eventId);
            const { groupId, isNewMember, addressSha256Hash } = event;
            // emit event
            this._events.emit(EventGroupMemberChangedLiteKey, { groupId, isNewMember, addressSha256Hash });
            // log event emitted
            console.log(EventGroupMemberChangedLiteKey,{ groupId, isNewMember, addressSha256Hash })
            return this._refreshGroupMember(groupId, isNewMember, addressSha256Hash)
        }
            
        return true;
        
    }

    on(key: string, callback: (event: any) => void) {
        this._events.on(key, callback)
    }
    off(key: string, callback: (event: any) => void) {
        this._events.off(key, callback)
    }
    _getGroupMemberKey(groupId: string) {
        return `GroupMemberDomain.groupMember.${groupId}`;
    }
    _refreshGroupMember(groupId: string, isNewMember: boolean, addressSha256Hash: string) {
        // log
        console.log(`GroupMemberDomain refreshGroupMember ${groupId}`);
        
        if (this._processingGroupIds.has(groupId)) {
            return false;
        }
        const handle = setTimeout(async () => {
            try {
                const groupMemberList = await this.groupFiService.loadGroupMemberAddresses2(groupId) as {ownerAddress:string,publicKey:string}[];
                const groupMember: IGroupMember = {
                    groupId,
                    memberAddressList: groupMemberList.map(({ownerAddress,publicKey}) => ({addr:ownerAddress,publicKey}))
                };
                this.combinedStorageService.setSingleThreaded(this._getGroupMemberKey(groupId), groupMember, this._lruCache);
                const groupMemberChangedEventData: {
                    groupId: string
                    isNewMember: boolean
                    memberAddress?: string
                } = {
                    groupId, 
                    isNewMember
                }
                if(isNewMember) {
                    groupMemberChangedEventData.memberAddress = groupMember.memberAddressList.find(
                        ({ addr }) =>
                          this.groupFiService.addHexPrefixIfAbsent(
                            this.groupFiService.sha256Hash(addr)
                          ) === this.groupFiService.addHexPrefixIfAbsent(addressSha256Hash)
                      )?.addr
                }
                // emit event
                this._events.emit(EventGroupMemberChangedKey, groupMemberChangedEventData);
            } catch (e) {
                console.error(e);
            } finally {
                this._processingGroupIds.delete(groupId);
            }
        }, 0);
        this._processingGroupIds.set(groupId,handle);
        return true;
        
    }

    async getGroupMember(groupId: string): Promise<{addr:string,publicKey:string}[] | undefined> {
        const groupMember = await this.combinedStorageService.get(this._getGroupMemberKey(groupId), this._lruCache);
        if (groupMember) {
            return groupMember.memberAddressList;
        } else {
            return undefined;
        }
    }
}