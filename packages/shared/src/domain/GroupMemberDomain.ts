import { Inject, Singleton } from "typescript-ioc";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { IClearCommandBase, ICommandBase, ICycle, IFetchPublicGroupMessageCommand, IRunnable, IIncludesAndExcludes } from "../types";
import { ThreadHandler } from "../util/thread";
import { LRUCache } from "../util/lru";
import { GroupFiService } from "../service/GroupFiService";
import { GroupConfig, GroupConfigPlus, EvmQualifyChangedEvent,EventGroupMemberChanged, EventGroupUpdateMinMaxToken,DomainGroupUpdateMinMaxToken, ImInboxEventTypeGroupMemberChanged,ImInboxEventTypeMarkChanged, ImInboxEventTypeEvmQualifyChanged, PushedEvent, EventGroupMarkChanged, ImInboxEventTypeMuteChanged, EventGroupMuteChanged, ImInboxEventTypeLikeChanged, EventGroupLikeChanged} from "iotacat-sdk-core";
import { objectId, bytesToHex, compareHex } from "iotacat-sdk-utils";
import { Channel } from "../util/channel";
import { EventSourceDomain } from "./EventSourceDomain";
import EventEmitter from "events";
import { IConversationDomainCmdFetchPublicGroupMessage } from "./ConversationDomain";
import { SharedContext } from "./SharedContext";
export const StoragePrefixGroupMinMaxToken = 'GroupMemberDomain.groupMinMaxToken';
export interface IGroupMember {
    groupId: string;
    memberAddressList: {addr:string,publicKey:string}[];
}
export const EventGroupMemberChangedKey = 'GroupMemberDomain.groupMemberChanged';
export const EventGroupMemberChangedLiteKey = 'GroupMemberDomain.groupMemberChangedLite';
export const EventGroupMarkChangedLiteKey = 'GroupMemberDomain.groupMarkChangedLite'
export const EventForMeGroupConfigChangedKey = 'GroupMemberDomain.forMeGroupConfigChanged';
export const EventMarkedGroupConfigChangedKey = 'GroupMemberDomain.markedGroupConfigChanged';
export const EventGroupMuteChangedLiteKey = 'GroupMemberDomain.groupMuteChangedLite'
export const EventGroupLikeChangedLiteKey = 'GroupMemberDomain.groupLikeChangedLite'
@Singleton
export class GroupMemberDomain implements ICycle, IRunnable {
    private _lruCache: LRUCache<IGroupMember>;
    private _evmQualifyCache: LRUCache<{addr:string,publicKey:string}[]>;
    private _processingGroupIds: Map<string,NodeJS.Timeout>;
    private _inChannel: Channel<PushedEvent|EventGroupUpdateMinMaxToken>;
    private _groupMemberDomainCmdChannel: Channel<IClearCommandBase<any>> = new Channel<IClearCommandBase<any>>();
    private _forMeGroupConfigs:GroupConfigPlus[] = [];

    @Inject
    private _context:SharedContext;

    // get for me group Configs
    get forMeGroupConfigs() {
        // if isLoggedIn, return all for me group configs, else return only public group configs
        return this._context.isLoggedIn ? this._forMeGroupConfigs : this._forMeGroupConfigs.filter(({isPublic}) => isPublic);
    }
    // get marked group configs
    get markedGroupConfigs() {
        // if isLoggedIn, return all marked group configs, else return empty array
        return this._context.isLoggedIn ? this._markedGroupConfigs : [];
    }
    private _markedGroupConfigs:GroupConfig[] | undefined = undefined;

    _onIncludesAndExcludesChangedHandler: () => void;
    _onLoggedInHandler: () => void;
    // isCanRefreshForMeGroupConfigs
    _isCanRefreshForMeGroupConfigs(): boolean {
        return this._context.isIncludeGroupNamesSet;
    }

    _lastTimeRefreshForMeGroupConfigs: number = 0;

    _lastTimeUpdateAllGroupIdsWithinContext: number = 0;

    _isCanUpdateAllGroupIdsWithinContext(): boolean {
        return this._context.isIncludeGroupNamesSet;
    }
    _isShouldUpdateAllGroupIdsWithinContext(): boolean {
        return Date.now() - this._lastTimeUpdateAllGroupIdsWithinContext > 60 * 1000;
    }
    async _actualUpdateAllGroupIdsWithinContext() {
        const groupIds = this._getAllGroupIds();
        this._context.setAllGroupIds(groupIds, 'GroupMemberDomain','_actualUpdateAllGroupIdsWithinContext');
        this._lastTimeUpdateAllGroupIdsWithinContext = Date.now();
    }
    async tryUpdateAllGroupIdsWithinContext() {
        if (!this._isCanUpdateAllGroupIdsWithinContext()) {
            return false;
        }
        if (this._isShouldUpdateAllGroupIdsWithinContext()) {
            await this._actualUpdateAllGroupIdsWithinContext();
            return true;
        }
        return false;
    }
    // isShouldRefreshForMeGroupConfigs
    _isShouldRefreshForMeGroupConfigs(): boolean {
        return Date.now() - this._lastTimeRefreshForMeGroupConfigs > 60 * 1000;
    }

    // actualRefreshForMeGroupConfigs
    async _actualRefreshForMeGroupConfigs() {
        try {
            // log entering _actualRefreshForMeGroupConfigs
            const includesAndExcludes = this._context.includesAndExcludes;
            console.log('entering _actualRefreshForMeGroupConfigs', includesAndExcludes);
            const rawConfigs = await this.groupFiService.fetchForMeGroupConfigs({includes:includesAndExcludes});
            const configs = this._sortForMeGroupConfigsByIncludes(rawConfigs)
            this._forMeGroupConfigs = configs;
            // get public group ids
            const publicGroupIds = configs.filter(({isPublic}) => isPublic).map(({groupId}) => groupId);
            const cmd:IFetchPublicGroupMessageCommand = {
                type: 'publicGroupOnBoot',
                groupIds: publicGroupIds
            }
            this._groupMemberDomainCmdChannel.push(cmd);
            this._lastTimeRefreshForMeGroupConfigs = Date.now();
            // emit event
            this._events.emit(EventForMeGroupConfigChangedKey,configs);
        } catch(error) {
            console.error('_actualRefreshForMeGroupConfigs erorr', error)
        }
    }

    _sortForMeGroupConfigsByIncludes(configs:GroupConfigPlus[]) {
        const includesAndExcludes = this._context.includesAndExcludes;
        const getKey = (item: {groupName:string, chainId?: number}) => `${item.groupName}${item.chainId??0}`
        const orderMap = new Map(includesAndExcludes.map((item,index) => [getKey(item), index]))
        const sortedConfigs = configs.sort((a: GroupConfigPlus,b: GroupConfigPlus) => {
            const aKey = getKey(a)
            const bKey = getKey(b)
            const aIndex = orderMap.get(aKey)
            const bIndex = orderMap.get(bKey)
            if (aIndex !== undefined && bIndex !== undefined) {
                return aIndex - bIndex
            }
            return 0
        })
        return sortedConfigs
    }

    // try refresh public group configs, return is actual refreshed
    async tryRefreshForMeGroupConfigs() {
        if (!this._isCanRefreshForMeGroupConfigs()) {
            return false;
        }
        if (this._isShouldRefreshForMeGroupConfigs()) {
            await this._actualRefreshForMeGroupConfigs();
            this._context.setIsForMeGroupsLoading(false, 'tryRefreshForMeGroupConfigs', 'forme groups loaded')
            return true;
        }
        return false;
    }

    // same sets of functions for marked group configs
    _isCanRefreshMarkedGroupConfigs(): boolean {
        return this._context.isLoggedIn;
    }

    _lastTimeRefreshMarkedGroupConfigs: number = 0;
    _isShouldRefreshMarkedGroupConfigs(): boolean {
        return (Date.now() - this._lastTimeRefreshMarkedGroupConfigs) > 60 * 1000;
    }

    async _actualRefreshMarkedGroupConfigs() {
        // log entering _actualRefreshMarkedGroupConfigs
        console.log('entering _actualRefreshMarkedGroupConfigs');
        const configs = await this.groupFiService.fetchAddressMarkedGroupConfigs();
        this._markedGroupConfigs = configs;
        this._lastTimeRefreshMarkedGroupConfigs = Date.now();
        // emit event
        this._events.emit(EventMarkedGroupConfigChangedKey,configs);
    }

    _getAllGroupIds() {
        // merge for me group ids and marked group ids
        return [...this._getForMeGroupIds(),...this._getMarkedGroupIds()];
    }

    _getForMeGroupIds() {
        // if isLoggedIn, return all for me group ids, else return only public group ids from for me group configs
        if (this._context.isLoggedIn) {
            return this._forMeGroupConfigs.map(({groupId}) => groupId);
        } else {
            return this._forMeGroupConfigs.filter(({isPublic}) => isPublic).map(({groupId}) => groupId);
        }        
    }
    _getMarkedGroupIds() {
        // if isLoggedIn, return all marked group ids, else return empty array
        if (this._context.isLoggedIn) {
            return (this._markedGroupConfigs ?? []).map(({groupId}) => groupId);
        } else {
            return [];
        }
    }
    async tryRefreshMarkedGroupConfigs() {
        if (!this._isCanRefreshMarkedGroupConfigs()) {
            return false;
        }
        if (this._isShouldRefreshMarkedGroupConfigs()) {
            await this._actualRefreshMarkedGroupConfigs();
            return true;
        }
        return false;
    }

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
        if (this._groupMaxMinTokenLruCache) {
            this._groupMaxMinTokenLruCache.clear();
        }
        // _forMeGroupIdsLastUpdateTimestamp reset all time to 0
        // if (this._forMeGroupIdsLastUpdateTimestamp) {
        //     for (const groupId in this._forMeGroupIdsLastUpdateTimestamp) {
        //         this._forMeGroupIdsLastUpdateTimestamp[groupId] = 0;
        //     }
        // }
        this._forMeGroupIdsLastUpdateTimestamp = {}
        
        if (this._isGroupMaxMinTokenCacheDirtyGroupIds) {
            this._isGroupMaxMinTokenCacheDirtyGroupIds.clear();
        }
        if (this._groupMaxMinTokenLruCache) {
            this._groupMaxMinTokenLruCache.clear();
        }
        if (this._evmQualifyCache) {
            this._evmQualifyCache.clear();
        }
        // clear for me group configs
        this._forMeGroupConfigs = []

        // clear marked group configs
        this._markedGroupConfigs = []

        if (this._markedGroupIds) {
            this._markedGroupIds.clear();
        }
    }
    async bootstrap(): Promise<void> {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'GroupMemberDomain', 1000);
        this._lruCache = new LRUCache<IGroupMember>(100);
        this._evmQualifyCache = new LRUCache<{addr:string,publicKey:string}[]>(100);
        this._groupMaxMinTokenLruCache = new LRUCache<{max?:string,min?:string}>(100);
        this._onIncludesAndExcludesChangedHandler = () => {
            this._lastTimeRefreshForMeGroupConfigs = 0;
            this._lastTimeUpdateAllGroupIdsWithinContext = 0;
        }
        this._onLoggedInHandler = () => {
            if (this._context.isLoggedIn) {
                this._lastTimeRefreshMarkedGroupConfigs = 0;
            }
            this._lastTimeUpdateAllGroupIdsWithinContext = 0;
        }
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
        this._context.clearIsForMeGroupsLoading('GroupMemberDomain','thread start')

        this._lastTimeRefreshForMeGroupConfigs = 0
        this._lastTimeRefreshMarkedGroupConfigs = 0

        if (this._isCanRefreshForMeGroupConfigs()) {
            this._context.setIsForMeGroupsLoading(true, 'GroupMemberDomain start', 'can refreshForMeGroupConfigs')
        }
        
        // initial address qualified group configs
        // await this.groupFiService.initialAddressQualifiedGroupConfigs()
        this.threadHandler.start();
        // log
        console.log('GroupMemberDomain started');
    }

    async resume() {
        this._context.onIncludesAndExcludesChanged(this._onIncludesAndExcludesChangedHandler.bind(this));
        this._context.onLoginStatusChanged(this._onLoggedInHandler.bind(this));
        this.threadHandler.resume();
    }

    async pause() {
        this._context.offIncludesAndExcludesChanged(this._onIncludesAndExcludesChangedHandler.bind(this));
        this._context.offLoginStatusChanged(this._onLoggedInHandler.bind(this));
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

    async poll(): Promise<boolean> {
        const cmd = this._groupMemberDomainCmdChannel.poll();
        if (cmd) {
            // log
            console.log(`GroupMemberDomain poll ${JSON.stringify(cmd)}`);
            if (cmd.type === 'publicGroupOnBoot') {
                let { groupIds } = cmd as IFetchPublicGroupMessageCommand;
                for (const groupId of groupIds) {
                    console.log('_processedPublicGroupIds has groupId?', groupId, this._processedPublicGroupIds.has(groupId))
                }
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
            const { type } = event;
            if (type === ImInboxEventTypeGroupMemberChanged) {
                console.log('mqtt event ImInboxEventTypeGroupMemberChanged', event)
                const { groupId, isNewMember, address, timestamp } = event as EventGroupMemberChanged;
                this._events.emit(EventGroupMemberChangedLiteKey, event);
                this._lastTimeRefreshMarkedGroupConfigs = 0;
                // log event emitted
                console.log(EventGroupMemberChangedLiteKey,{ groupId, isNewMember, address })
                this._refreshGroupMember(groupId);
            } else if (type === DomainGroupUpdateMinMaxToken) {
                console.log('==> mqtt event DomainGroupUpdateMinMaxToken', event)
                const { groupId, min,max } = event as EventGroupUpdateMinMaxToken;
                this.tryUpdateGroupMaxMinToken(groupId,{min,max});
            } else if (type === ImInboxEventTypeMarkChanged) {
                const { groupId, isNewMark} = event as EventGroupMarkChanged
                this._lastTimeRefreshMarkedGroupConfigs = 0;
                this._events.emit(EventGroupMarkChangedLiteKey, event)
            } else if (type === ImInboxEventTypeEvmQualifyChanged) {
                const { groupId } = event as EvmQualifyChangedEvent
                this._refreshGroupEvmQualify(groupId);
            } else if (type === ImInboxEventTypeMuteChanged) {
                const { groupId, isNewMute } = event as EventGroupMuteChanged
                this._events.emit(EventGroupMuteChangedLiteKey, event)
            } else if (type === ImInboxEventTypeLikeChanged) {
                this._events.emit(EventGroupLikeChangedLiteKey, event as EventGroupLikeChanged)
            }
            return false;
        } 
        // handle dirty group max min token
        if (this._isGroupMaxMinTokenCacheDirtyGroupIds.size > 0) {
            // log
            console.log('GroupMemberDomain poll dirty group max min token');
            this.persistDirtyGroupMaxMinToken();
            return false;
        } 
        const isForMeConfigUpdated = await this.tryRefreshForMeGroupConfigs();
        if (isForMeConfigUpdated) {
            return false;
        }
        const isMarkedConfigUpdated = await this.tryRefreshMarkedGroupConfigs();
        if (isMarkedConfigUpdated) {
            return false;
        }
        const isAllGroupIdsUpdated = await this.tryUpdateAllGroupIdsWithinContext();
        if (isAllGroupIdsUpdated) {
            return false;
        }
        await this._checkForMeGroupIdsLastUpdateTimestamp();
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
        console.log('===> _checkForMeGroupIdsLastUpdateTimestamp', this._forMeGroupIdsLastUpdateTimestamp)
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
                    // log cmd
                    console.log('_checkForMeGroupIdsLastUpdateTimestamp cmd',cmd);
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
    _getGroupEvmQualifyKey(groupId: string) {
        return `GroupMemberDomain.groupEvmQualify.${groupId}`;
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
    _refreshGroupEvmQualify(groupId: string) {
        const key = this._getGroupEvmQualifyKey(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        const handle = setTimeout(async () => {
            await this._refreshGroupEvmQualifyInternal(groupId);
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

    // refresh group qualified async
    async _refreshGroupEvmQualifyAsync(groupId: string) {
        const key = this._getGroupEvmQualifyKey(groupId);
        if (this._processingGroupIds.has(key)) {
            return false;
        }
        this._processingGroupIds.set(key,0 as any);
        await this._refreshGroupEvmQualifyInternal(groupId);
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
            console.error('_refreshGroupMemberInternal',e);
        } finally {
            const key = this._getKeyForGroupMember(groupId);
            this._processingGroupIds.delete(key);
        }
    }
    // refresh group evm qualify internal
    async _refreshGroupEvmQualifyInternal(groupId: string) {
        // log entering refreshGroupEvmQualifyInternal
        console.log('entering refreshGroupEvmQualifyInternal',groupId);
        const key = this._getGroupEvmQualifyKey(groupId);
        try {
            const groupQualifyList = await this.groupFiService.getPluginGroupEvmQualifiedList(groupId);
            this.combinedStorageService.setSingleThreaded(key, groupQualifyList, this._evmQualifyCache);
        } catch (e) {
            console.error('refreshGroupEvmQualifyInternal',e);
        } finally {
            this._processingGroupIds.delete(key);
        }
    }
    _gid(groupId: string) {
        return this.groupFiService.addHexPrefixIfAbsent(groupId);
    }
    // refresh is group public async
    async _refreshGroupPublicAsync(groupId: string) {
        // log entering _refreshGroupPublicAsync
        console.log('entering _refreshGroupPublicAsync',groupId);
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
        // log entering _refreshGroupPublicInternal
        console.log('entering _refreshGroupPublicInternal',groupId);
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
        if (!this._isCanRefreshMarkedGroupConfigs()) {
            return
        }
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
    async getGroupEvmQualify(groupId: string): Promise<{addr:string,publicKey:string}[] | undefined> {
        const key = this._getGroupEvmQualifyKey(groupId);
        const groupQualifyList = await this.combinedStorageService.get(key, this._evmQualifyCache);
        if (groupQualifyList) {
            return groupQualifyList;
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