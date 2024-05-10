import { Inject, Singleton } from "typescript-ioc";
import { IMessage, IotaCatSDKObj } from 'iotacat-sdk-core'
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MessageHubDomain } from "./MessageHubDomain";
import { ICycle, IInboxMessage, IRunnable } from "../types";
import { Channel } from "../util/channel";
import { ThreadHandler } from "../util/thread";
import EventEmitter from "events";
import { LRUCache } from "../util/lru";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { IInboxGroup, IInboxRecommendGroup } from "../types";
// maintain list of groupid, order matters
// maintain state of each group, including group name, last message, unread count, etc
// restore from local storage on start, then update on new message from inbox message hub domain
export const InboxListStoreKey = 'InboxDomain.groupIdsList';
export const InboxGroupStorePrefix = 'InboxDomain.group.';
export const EventInboxLoaded = 'InboxDomain.loaded';
export const EventInboxReady = 'InboxDomain.ready';
export const EventInboxUpdated = 'InboxDomain.updated';
export const MaxGroupInInbox = 500;
export const MaxUnReadInInbox = 20

@Singleton
export class InboxDomain implements ICycle, IRunnable {

    @Inject
    private combinedStorageService: CombinedStorageService;

    @Inject
    private localStorageRepository: LocalStorageRepository;
    private _events: EventEmitter = new EventEmitter();
    private _groupIdsList: string[] = [];
    private _groups: LRUCache<IInboxGroup>;
    private _pendingGroupIdsListUpdate: boolean = false;
    private _pendingGroupsUpdateGroupIds: Set<string> = new Set<string>();
    private _firstUpdateEmitted: boolean = false;
    cacheClear() {
        if (this._groups) {
            this._groups.clear();
        }
    }
    getGroupStoreKey(groupId: string) {
        return `${InboxGroupStorePrefix}${groupId}`;
    }
    private threadHandler: ThreadHandler;
    async start() {
        this.switchAddress()
        this.threadHandler.start();
    }
    
    async resume() {
        this.threadHandler.resume();
    }

    async pause() {
        this.threadHandler.pause();
    }

    async stop() {
        this.cacheClear()
        this.threadHandler.stop();
    }

    async destroy() {
        this.threadHandler.destroy();
        //@ts-ignore
        this._groups = undefined;
    }

    _getDefaultGroup(groupId: string): IInboxGroup {
        return {
            groupId,
            groupName: IotaCatSDKObj.groupIdToGroupName(groupId),
            latestMessage: undefined,
            unreadCount: 0
        }
    }

    async _loadGroupIdsListFromLocalStorage() {
        const groupIdsListRaw = await this.localStorageRepository.get(InboxListStoreKey);
        // log method and groupIdsListRaw
        console.log('_loadGroupIdsListFromLocalStorage', groupIdsListRaw);
        if (groupIdsListRaw) {
            this._groupIdsList = JSON.parse(groupIdsListRaw) as string[]
        }
    }
    async _saveGroupIdsListToLocalStorage() {
        // log method and groupIdsList
        console.log('_saveGroupIdsListToLocalStorage',this._groupIdsList);
        await this.localStorageRepository.set(InboxListStoreKey, JSON.stringify(this._groupIdsList));
    }
    async _moveGroupIdToFront(groupId: string) {
        // make a new list
        const newList = [groupId];
        // loop through old list, add all other group id to new list
        for (const oldGroupId of this._groupIdsList) {
            if (oldGroupId !== groupId) {
                newList.push(oldGroupId);
            }
        }
        // truncate new list to max length
        newList.length = Math.min(newList.length, MaxGroupInInbox);
        // update list
        this._groupIdsList = newList;
        this._pendingGroupIdsListUpdate = true;
    }

    async getGroup(groupId: string) {
        const key = this.getGroupStoreKey(groupId);
        const group = await this.combinedStorageService.get(key, this._groups);
        if (group) {
            return group;
        } else {
            const defaultGroup = this._getDefaultGroup(groupId);
            this._groups.put(key, defaultGroup)
            return defaultGroup;
        }
    }
    _getGroupFromCacheOnly(groupId: string) {
        const key = this.getGroupStoreKey(groupId);
        const group = this._groups.get(key);
        if (group) {
            return group;
        } else {
            return undefined;
        }
    }
    setGroup(groupId: string, group: IInboxGroup) {
        const key = this.getGroupStoreKey(groupId);
        this.combinedStorageService.setSingleThreaded(key, group, this._groups);
    }
    _persistGroupIfInCache(groupId: string) {
        const group = this._getGroupFromCacheOnly(groupId);
        if (group) {
            this.setGroup(groupId, group);
        }
    }
    async clearUnreadCount(groupId: string) {
        const group = await this.getGroup(groupId);
        group.unreadCount = 0;
        group.lastTimeReadLatestMessageTimestamp = group.latestMessage?.timestamp??0;
        this.setGroup(groupId, group);
    }

    async setUnreadCount(groupId: string, unreadCount: number, lastTimeReadLatestMessageTimestamp: number) {
        const group = await this.getGroup(groupId);
        group.unreadCount = unreadCount
        group.lastTimeReadLatestMessageTimestamp = lastTimeReadLatestMessageTimestamp
        this.setGroup(groupId, group);
    }
    
    async poll(): Promise<boolean> {
        // poll from in channel
        const messageStruct = this._inChannel.poll();

        if (messageStruct) {
            // log messageStruct
            console.log('InboxDomain messageStruct', messageStruct);
            //{messageId:string, groupId:string, sender:string, message:string, timestamp:number}
            const { groupId, sender, message, timestamp } = messageStruct;
            const group = await this.getGroup(groupId);

            const latestMessage: IInboxMessage = {
                sender,
                message,
                timestamp
            }

            const isNewMessageEarlierThanCurrentLatestMessage = group.latestMessage !== undefined && timestamp < group.latestMessage.timestamp
            if(!isNewMessageEarlierThanCurrentLatestMessage) {
                group.latestMessage = latestMessage
                this._moveGroupIdToFront(groupId)
                this._pendingGroupsUpdateGroupIds.add(groupId);
            }
            // update unread count if unread count is less than max and message's timestamp is later than last time read
            if (group.unreadCount <= MaxUnReadInInbox && timestamp > (group.lastTimeReadLatestMessageTimestamp??0)) {
                // log unread count increase, timestamp, lastTimeReadLatestMessageTimestamp
                group.unreadCount++
                this._pendingGroupsUpdateGroupIds.add(groupId);
            }

            // log message received
            console.log('InboxDomain message received', messageStruct,group,this._groupIdsList);
            return false;
        } else {
            let dataChanged = false;
            if (this._pendingGroupIdsListUpdate) {
                this._pendingGroupIdsListUpdate = false;
                await this._saveGroupIdsListToLocalStorage();
                dataChanged = true;
            }
            if (this._pendingGroupsUpdateGroupIds.size > 0) {
                const groupIds = Array.from(this._pendingGroupsUpdateGroupIds);
                this._pendingGroupsUpdateGroupIds.clear();
                for (const groupId of groupIds) {
                    this._persistGroupIfInCache(groupId);
                }
                dataChanged = true;
            }
            if (dataChanged) {
                this._events.emit(EventInboxUpdated);
                // log event
                console.log('InboxDomain event emitted', EventInboxUpdated);
            }
            return true;
        }
    }

    onInboxReady(callback: () => void) {
        this._events.on(EventInboxReady, callback);
    }
    offInboxReady(callback: () => void) {
        this._events.off(EventInboxReady, callback);
    }
    onInboxUpdated(callback: () => void) {
        this._events.on(EventInboxUpdated, callback);
    }
    offInboxUpdated(callback: () => void) {
        this._events.off(EventInboxUpdated, callback);
    }
    onInboxLoaded(callback: () => void) {
        this._events.on(EventInboxLoaded, callback);
    }
    offInboxLoaded(callback: () => void) {
        this._events.off(EventInboxLoaded, callback);
    }
    @Inject
    private messageHubDomain: MessageHubDomain;
    
    private _inChannel: Channel<IMessage>;
    async bootstrap() {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'InboxDomain', 1000);
        this._inChannel = this.messageHubDomain.outChannelToInbox;
        this._groups = new LRUCache<IInboxGroup>(100);
        console.log('InboxDomain bootstraped')
    }

    async switchAddress() {
        await this._loadGroupIdsListFromLocalStorage();
        this._events.emit(EventInboxUpdated)
        // log event
        console.log('InboxDomain event emitted', EventInboxLoaded);
    }

    async getInbox() {
        const groupIds = this._groupIdsList;
        const groups: IInboxGroup[] = await Promise.all(groupIds.map((groupId) => this.getGroup(groupId)));
        return groups;
    }
}
