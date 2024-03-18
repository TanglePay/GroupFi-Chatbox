import { Inject, Singleton } from "typescript-ioc";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { ICycle, IRunnable } from "../types";
import { ThreadHandler } from "../util/thread";
import { LRUCache } from "../util/lru";
import { GroupFiService } from "../service/GroupFiService";
import { EventGroupMemberChanged, EventGroupUpdateMinMaxToken,DomainGroupUpdateMinMaxToken, ImInboxEventTypeGroupMemberChanged} from "iotacat-sdk-core";
import { objectId, bytesToHex, compareHex } from "iotacat-sdk-utils";
import { Channel } from "../util/channel";
import { EventSourceDomain } from "./EventSourceDomain";
import EventEmitter from "events";
export const StoragePrefixGroupMinMaxToken = 'GroupMemberDomain.groupMinMaxToken';
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
    private _inChannel: Channel<EventGroupMemberChanged|EventGroupUpdateMinMaxToken>;

    private _isGroupPublic: Map<string,boolean> = new Map<string,boolean>();

    // group max min token
    private _groupMaxMinTokenLruCache: LRUCache<{max?:string,min?:string}>;

    _isGroupMaxMinTokenCacheDirtyGroupIds: Set<string> = new Set<string>();
    // try update group max min token
    async tryUpdateGroupMaxMinToken(groupId: string, {max,min}:{max?:string,min?:string}) {
        // compare token using compareHex
        let old = this._groupMaxMinTokenLruCache.getOrDefault(groupId,{});
        if (max && (!old.max || compareHex(max,old.max) > 0)) {
            old.max = max;
            // set dirty
            this._isGroupMaxMinTokenCacheDirtyGroupIds.add(groupId);
        }
        if (min && (!old.min || compareHex(min,old.min) < 0)) {
            old.min = min;
            // set dirty
            this._isGroupMaxMinTokenCacheDirtyGroupIds.add(groupId);
        }
    }

    // get key for group max min token
    _getGroupMaxMinTokenKey(groupId: string) {
        return `${StoragePrefixGroupMinMaxToken}.${groupId}`;
    }
    // get group max min token
    async getGroupMaxMinToken(groupId: string): Promise<{max?:string,min?:string}|null> {
        const key = this._getGroupMaxMinTokenKey(groupId);
        return await this.combinedStorageService.get(key,this._groupMaxMinTokenLruCache);
    }
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
            const { type } = event;
            if (type === ImInboxEventTypeGroupMemberChanged) {
                const { groupId, isNewMember, address, timestamp } = event as EventGroupMemberChanged;
                // emit event
                this._events.emit(EventGroupMemberChangedLiteKey, event);
                // log event emitted
                console.log(EventGroupMemberChangedLiteKey,{ groupId, isNewMember, address })
                this._refreshGroupMember(groupId);
            } else if (type === DomainGroupUpdateMinMaxToken) {
                const { groupId, min,max } = event as EventGroupUpdateMinMaxToken;
                this.tryUpdateGroupMaxMinToken(groupId,{min,max});
            }
            return false;
        } 
        // handle dirty group max min token
        else if (this._isGroupMaxMinTokenCacheDirtyGroupIds.size > 0) {
            for (const groupId of this._isGroupMaxMinTokenCacheDirtyGroupIds) {
                const key = this._getGroupMaxMinTokenKey(groupId);
                const value = this._groupMaxMinTokenLruCache.getOrDefault(groupId,{});
                this.combinedStorageService.setSingleThreaded(key,value,this._groupMaxMinTokenLruCache);
            }
            this._isGroupMaxMinTokenCacheDirtyGroupIds.clear();
            return false;
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
    _refreshGroupMember(groupId: string) {
        // log
        console.log(`GroupMemberDomain refreshGroupMember ${groupId}`);
        const key = this._getGroupMemberKey(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        const handle = setTimeout(async () => {
            await this._refreshGroupMemberInternal(groupId);
        }, 0);
        this._processingGroupIds.set(key,handle);
        return true;
        
    }
    // get key for group member
    _getKeyForGroupMember(groupId: string) {
        return `GroupMemberDomain.groupMember.${groupId}`;
    }
    // get key for group public
    _getKeyForGroupPublic(groupId: string) {
        return `GroupMemberDomain.groupPublic.${groupId}`;
    }

    async _refreshGroupMemberAsync(groupId: string) {
        // log
        console.log(`GroupMemberDomain refreshGroupMember ${groupId}`);
        const key = this._getKeyForGroupMember(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        this._processingGroupIds.set(key,0 as any);
        await this._refreshGroupMemberInternal(groupId);
    }


    async _refreshGroupMemberInternal(groupId: string) {
        try {
            const groupMemberList = await this.groupFiService.loadGroupMemberAddresses2(groupId) as {ownerAddress:string,publicKey:string}[];
            const groupMember: IGroupMember = {
                groupId,
                memberAddressList: groupMemberList.map(({ownerAddress,publicKey}) => ({addr:ownerAddress,publicKey}))
            };
            this.combinedStorageService.setSingleThreaded(this._getGroupMemberKey(groupId), groupMember, this._lruCache);                
            // emit event
            this._events.emit(EventGroupMemberChangedKey, {groupId});
        } catch (e) {
            console.error(e);
        } finally {
            const key = this._getKeyForGroupMember(groupId);
            this._processingGroupIds.delete(key);
        }
    }
    // refresh is group public async
    async _refreshGroupPublicAsync(groupId: string) {
        const key = this._getKeyForGroupPublic(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        this._processingGroupIds.set(key,0 as any);
        await this._refreshGroupPublicInternal(groupId);
    }
    // refresh is group public
    async _refreshGroupPublicInternal(groupId: string) {
        try {
            const isGroupPublic = await this.groupFiService.isGroupPublic(groupId);
            this._isGroupPublic.set(groupId,isGroupPublic);
        } catch (e) {
            console.error(e);
        } finally {
            const key = this._getKeyForGroupPublic(groupId);
            this._processingGroupIds.delete(key);
        }
    }
    async getGroupMember(groupId: string): Promise<{addr:string,publicKey:string}[] | undefined> {
        const groupMember = await this.combinedStorageService.get(this._getGroupMemberKey(groupId), this._lruCache);
        if (groupMember) {
            return groupMember.memberAddressList;
        } else {
            return undefined;
        }
    }
    // get is group public
    async isGroupPublic(groupId: string): Promise<boolean | undefined> {
        if (this._isGroupPublic.has(groupId)) {
            return this._isGroupPublic.get(groupId);
        } else {
            return undefined;
        }
    }
}