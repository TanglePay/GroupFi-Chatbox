import { Inject, Singleton } from "typescript-ioc";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { IClearCommandBase, ICommandBase, ICycle, IFetchPublicGroupMessageCommand, IRunnable, IGroupMemberPollTask } from "../types";
import { ThreadHandler } from "../util/thread";
import { LRUCache } from "../util/lru";
import { GroupFiService } from "../service/GroupFiService";
import { EventGroupMemberChanged, EventGroupUpdateMinMaxToken,DomainGroupUpdateMinMaxToken, ImInboxEventTypeGroupMemberChanged, ImInboxEventTypeMarkChanged, EventGroupMarkChanged} from "iotacat-sdk-core";
import { objectId, bytesToHex, compareHex } from "iotacat-sdk-utils";
import { Channel } from "../util/channel";
import { EventSourceDomain } from "./EventSourceDomain";
import EventEmitter from "events";
import { IConversationDomainCmdFetchPublicGroupMessage } from "./ConversationDomain";
export const StoragePrefixGroupMinMaxToken = 'GroupMemberDomain.groupMinMaxToken';
export interface IGroupMember {
    groupId: string;
    memberAddressList: {addr:string,publicKey:string}[];
}
export const EventGroupMemberChangedKey = 'GroupMemberDomain.groupMemberChanged';
export const EventGroupMemberChangedLiteKey = 'GroupMemberDomain.groupMemberChangedLite';
export const EventGroupMarkChangedLiteKey = 'GroupMemberDomain.groupMarkChangedLite'
@Singleton
export class GroupMemberDomain implements ICycle, IRunnable {
    private _lruCache: LRUCache<IGroupMember>;
    private _processingGroupIds: Map<string,NodeJS.Timeout>;
    private _inChannel: Channel<EventGroupMemberChanged|EventGroupUpdateMinMaxToken|EventGroupMarkChanged>;
    private _groupMemberDomainCmdChannel: Channel<IClearCommandBase<any>> = new Channel<IClearCommandBase<any>>();
    // getter for groupMemberDomainCmdChannel
    get groupMemberDomainCmdChannel() {
        return this._groupMemberDomainCmdChannel;
    }
    private _isGroupPublic: Map<string,boolean> = new Map<string,boolean>();

    private _markedGroupIds: Set<string> = new Set<string>();

    private _conversationDomainCmdChannel: Channel<ICommandBase<any>>;
    set conversationDomainCmdChannel(value: Channel<ICommandBase<any>>) {
        this._conversationDomainCmdChannel = value;
    }
    // group max min token
    private _groupMaxMinTokenLruCache: LRUCache<{max?:string,min?:string}>;

    _isGroupMaxMinTokenCacheDirtyGroupIds: Set<string> = new Set<string>();

    // try update group max min token
    async tryUpdateGroupMaxMinToken(groupId: string, {max,min}:{max?:string,min?:string}) {
        // compare token using compareHex
        let old = (await this.getGroupMaxMinToken(groupId)) || {};
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
        if (this._groupMaxMinTokenLruCache) {
            this._groupMaxMinTokenLruCache.clear();
        }
        // _forMeGroupIdsLastUpdateTimestamp reset all time to 0
        if (this._forMeGroupIdsLastUpdateTimestamp) {
            for (const groupId in this._forMeGroupIdsLastUpdateTimestamp) {
                this._forMeGroupIdsLastUpdateTimestamp[groupId] = 0;
            }
        }
        if (this._isGroupMaxMinTokenCacheDirtyGroupIds) {
            this._isGroupMaxMinTokenCacheDirtyGroupIds.clear();
        }
        if (this._groupMaxMinTokenLruCache) {
            this._groupMaxMinTokenLruCache.clear();
        }
    }
    async bootstrap(): Promise<void> {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'GroupMemberDomain', 1000);
        this._lruCache = new LRUCache<IGroupMember>(100);
        this._groupMaxMinTokenLruCache = new LRUCache<{max?:string,min?:string}>(100);
        
        this._inChannel = this.eventSourceDomain.outChannelToGroupMemberDomain;
        // log
        console.log('GroupMemberDomain bootstraped');
    }
    @Inject
    private combinedStorageService: CombinedStorageService;

    private threadHandler: ThreadHandler;
    async start() {
        this._processingGroupIds = new Map<string,NodeJS.Timeout>();
        this._processedPublicGroupIds = new Set<string>()
        this._groupMemberPollCurrentTask = undefined
        this._lastPerformGroupMemberPollTaskTime = 0
        this._lastEmitEventGroupMemberChangedEventTime = 0
        this._lastEmitEventGroupMemberChangedEventData = undefined
        this.threadHandler.start();
        // log
        console.log('GroupMemberDomain started');
    }

    async resume() {
        this.threadHandler.resume();
    }

    async pause() {
        this.persistDirtyGroupMaxMinToken();
        this.threadHandler.pause();
    }

    async stop() {
        this.cacheClear()
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
    _forMeGroupIdsLastUpdateTimestamp: Record<string,number> = {};
    _processedPublicGroupIds: Set<string>;

    _groupMemberPollCurrentTask: IGroupMemberPollTask | undefined = undefined
    _lastPerformGroupMemberPollTaskTime: number = 0

    addGroupMemberPollCurrentTask({maxPollCount=10, sleepAfterFinishInMs=1000, groupId, isNewMember}:IGroupMemberPollTask) {
        console.log('performGroupMemberPollCurrentTask add task')
        const address = this.groupFiService.getCurrentAddress()
        const task = {maxPollCount, sleepAfterFinishInMs, groupId, address, isNewMember}
        this._groupMemberPollCurrentTask = task
    }
    cancelGroupMemberPollCurrentTask() {
        console.log('Enter performGroupMemberPollCurrentTask canceled')
        this._groupMemberPollCurrentTask = undefined
    }
    cancelGroupMemberPollCurrentTaskIfEqual(task: {groupId:string, address: string, isNewMember: boolean}) {
        console.log('Enter performGroupMemberPollCurrentTask cancel', task)
        if (this._groupMemberPollCurrentTask === undefined) {
            return
        }
        const {groupId, address, isNewMember} = this._groupMemberPollCurrentTask
        if (groupId === task.groupId && address === task.address && isNewMember === task.isNewMember) {
            this._groupMemberPollCurrentTask = undefined
            console.log('Enter performGroupMemberPollCurrentTask canceled')
        }
    }
    async performGroupMemberPollCurrentTask() {
        console.log('Enter performGroupMemberPollCurrentTask')
        if (this._groupMemberPollCurrentTask === undefined) {
            return
        }
        const {groupId, address, isNewMember, sleepAfterFinishInMs} = this._groupMemberPollCurrentTask

        if (Date.now() - this._lastPerformGroupMemberPollTaskTime < sleepAfterFinishInMs!){
            return
        }

        console.log('Enter performGroupMemberPollCurrentTask Actually')
        
        try {
            const groupMemberLists = await this.groupFiService.loadGroupMemberAddresses2(groupId)
            const currentUser = groupMemberLists.find(member => member.ownerAddress === address)
            console.log('===> Enter performGroupMemberPollCurrentTask groupMemberLists', groupMemberLists, currentUser)
            if (isNewMember && currentUser !== undefined) {
                const eventData: EventGroupMemberChanged = {groupId, isNewMember, address,type: 2, timestamp: currentUser.timestamp}
                if (this._groupMemberPollCurrentTask !== undefined) {
                    console.log('===> Enter performGroupMemberPollCurrentTask edmit event', eventData)
                    // this._events.emit(EventGroupMemberChangedLiteKey, eventData);
                    this.emitEventGroupMemberChangedLiteKey(eventData)
                }
                this.cancelGroupMemberPollCurrentTask()
            } else if (!isNewMember && currentUser === undefined) {
                const eventData: EventGroupMemberChanged = {groupId, isNewMember, address,type: 2, timestamp: Date.now()}
                if (this._groupMemberPollCurrentTask !== undefined) {
                    console.log('===> Enter performGroupMemberPollCurrentTask edmit event',eventData)
                    // this._events.emit(EventGroupMemberChangedLiteKey, eventData)
                    this.emitEventGroupMemberChangedLiteKey(eventData)
                }
                this.cancelGroupMemberPollCurrentTask()
            }
            if (this._groupMemberPollCurrentTask) {
                this._groupMemberPollCurrentTask.maxPollCount!--
            }
        }catch(error) {
            console.log('performGroupMemberPollCurrentTask error', error)
        }finally {
            this._lastPerformGroupMemberPollTaskTime = Date.now()
        }
    }
    _lastEmitEventGroupMemberChangedEventTime: number = 0
    _lastEmitEventGroupMemberChangedEventData: EventGroupMemberChanged | undefined = undefined
    isEventGroupMemberChangedEventDataEqual(event: EventGroupMemberChanged) {
        if (this._lastEmitEventGroupMemberChangedEventData === undefined){
            return false
        }
        const { groupId, address, isNewMember} = this._lastEmitEventGroupMemberChangedEventData
        return event.groupId === groupId && address === event.address && isNewMember === event.isNewMember
    }
    emitEventGroupMemberChangedLiteKey(event: EventGroupMemberChanged) {
        const diff = Date.now() - this._lastEmitEventGroupMemberChangedEventTime
        console.log('performGroupMemberPollCurrentTask diff', diff)
        console.log('performGroupMemberPollCurrentTask isqual', this.isEventGroupMemberChangedEventDataEqual(event))
        if (this.isEventGroupMemberChangedEventDataEqual(event) && Date.now() - this._lastEmitEventGroupMemberChangedEventTime < 3000) {
            console.log('not emit event, performGroupMemberPollCurrentTask')
            return
        }
        this._events.emit(EventGroupMemberChangedLiteKey, event);
        this._lastEmitEventGroupMemberChangedEventData = event
        this._lastEmitEventGroupMemberChangedEventTime = Date.now()
    }
    async poll(): Promise<boolean> {
        const cmd = this._groupMemberDomainCmdChannel.poll();
        if (cmd) {
            // log
            console.log(`GroupMemberDomain poll ${JSON.stringify(cmd)}`);
            if (cmd.type === 'publicGroupOnBoot') {
                let { groupIds } = cmd as IFetchPublicGroupMessageCommand;
                // filter groupIds that are already processed
                groupIds = groupIds.filter(groupId => !this._processedPublicGroupIds.has(groupId));
                if (groupIds.length === 0) {
                    return false;
                }
                // update processedPublicGroupIds
                groupIds.map(groupId => this._processedPublicGroupIds.add(groupId));
                await Promise.all([
                    this._refreshMarkedGroupAsync(),
                    ...groupIds.map(groupId => this._refreshGroupPublicAsync(groupId))]);
                // log _markedGroupIds
                console.log('_markedGroupIds',this._markedGroupIds);
                this._forMeGroupIdsLastUpdateTimestamp = {};
                for (const groupId of groupIds) {
                    this._forMeGroupIdsLastUpdateTimestamp[groupId] = 0;
                }
            }
            return false;
        }


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
                console.log('mqtt event performGroupMemberPollCurrentTask', event)
                const { groupId, isNewMember, address, timestamp } = event as EventGroupMemberChanged;
                // emit event
                this.cancelGroupMemberPollCurrentTaskIfEqual({groupId, address, isNewMember})
                // this._events.emit(EventGroupMemberChangedLiteKey, event);
                this.emitEventGroupMemberChangedLiteKey(event)
                // log event emitted
                console.log(EventGroupMemberChangedLiteKey,{ groupId, isNewMember, address })
                this._refreshGroupMember(groupId);
            } else if (type === DomainGroupUpdateMinMaxToken) {
                const { groupId, min,max } = event as EventGroupUpdateMinMaxToken;
                this.tryUpdateGroupMaxMinToken(groupId,{min,max});
            } else if (type === ImInboxEventTypeMarkChanged) {
                const { groupId, isNewMark} = event as EventGroupMarkChanged
                this._events.emit(EventGroupMarkChangedLiteKey, event)
            }
            return false;
        } 
        // handle dirty group max min token
        else if (this._isGroupMaxMinTokenCacheDirtyGroupIds.size > 0) {
            // log
            console.log('GroupMemberDomain poll dirty group max min token');
            this.persistDirtyGroupMaxMinToken();
            return false;
        } else if (this._groupMemberPollCurrentTask) {
            if (this._groupMemberPollCurrentTask.maxPollCount! <= 0) {
                this.cancelGroupMemberPollCurrentTask()
            }
            await this.performGroupMemberPollCurrentTask()
        } else {
            await this._checkForMeGroupIdsLastUpdateTimestamp()
        }
        return true;
    }
    // persist dirty group max min token
    persistDirtyGroupMaxMinToken() {
        if (this._isGroupMaxMinTokenCacheDirtyGroupIds.size === 0) {
            return;
        }
        for (const groupId of this._isGroupMaxMinTokenCacheDirtyGroupIds) {
            const key = this._getGroupMaxMinTokenKey(groupId);
            const value = this._groupMaxMinTokenLruCache.getOrDefault(groupId,{});
            this.combinedStorageService.setSingleThreaded(key,value,this._groupMaxMinTokenLruCache);
        }
        this._isGroupMaxMinTokenCacheDirtyGroupIds.clear();
    }
    async _checkForMeGroupIdsLastUpdateTimestamp() {
        const now = Date.now();
        for (const groupId in this._forMeGroupIdsLastUpdateTimestamp) {
            if (now - this._forMeGroupIdsLastUpdateTimestamp[groupId] > 60 * 1000) {
                const isGroupPublic = await this.isGroupPublic(groupId);
                const isGroupMarked = this._markedGroupIds.has(groupId);
                // log groupId, isGroupPublic, isGroupMarked
                console.log(groupId,isGroupPublic,isGroupMarked);
                if (isGroupPublic && !isGroupMarked) {
                    const cmd:IConversationDomainCmdFetchPublicGroupMessage = {
                        type: 2,
                        groupId
                    };
                    this._conversationDomainCmdChannel.push(cmd);
                }
                this._forMeGroupIdsLastUpdateTimestamp[groupId] = now;
            }
        }
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
    // get key for group marked
    _getKeyForGroupMarked() {
        return `GroupMemberDomain.groupMarked`;
    }

    async _refreshGroupMemberAsync(groupId: string) {
        groupId = this._gid(groupId);
        // log
        console.log(`GroupMemberDomain refreshGroupMember ${groupId}`);
        const key = this._getKeyForGroupMember(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        this._processingGroupIds.set(key,0 as any);
        // log actual refresh
        console.log(`GroupMemberDomain refreshGroupMember ${groupId} actual refresh`);
        await this._refreshGroupMemberInternal(groupId);
    }


    async _refreshGroupMemberInternal(groupId: string) {
        groupId = this._gid(groupId);
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
    _gid(groupId: string) {
        return this.groupFiService.addHexPrefixIfAbsent(groupId);
    }
    // refresh is group public async
    async _refreshGroupPublicAsync(groupId: string) {
        groupId = this._gid(groupId);
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
    // refresh marked group async
    async _refreshMarkedGroupAsync() {
        const key = this._getKeyForGroupMarked();
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        this._processingGroupIds.set(key,0 as any);
        await this._refreshMarkedGroupInternal();
    }
    async _refreshMarkedGroupInternal() {
        try {
            const groupIds = await this.groupFiService.fetchAddressMarkedGroups();
            this._markedGroupIds = new Set(groupIds.map(this._gid.bind(this)));
        } catch (e) {
            console.error(e);
        } finally {
            const key = this._getKeyForGroupMarked();
            this._processingGroupIds.delete(key);
        }
    }
    async getGroupMember(groupId: string): Promise<{addr:string,publicKey:string}[] | undefined> {
        groupId = this._gid(groupId);
        const key = this._getGroupMemberKey(groupId);
        const groupMember = await this.combinedStorageService.get(key, this._lruCache);
        //TODO remove
        // log key groupMember
        console.log('getGroupMember',key,groupMember);
        if (groupMember) {
            return groupMember.memberAddressList;
        } else {
            return undefined;
        }
    }
    // get is group public
    async isGroupPublic(groupId: string): Promise<boolean | undefined> {
        groupId = this._gid(groupId);
        if (this._isGroupPublic.has(groupId)) {
            return this._isGroupPublic.get(groupId);
        } else {
            return undefined;
        }
    }
}