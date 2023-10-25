import { Inject, Singleton } from "typescript-ioc";
import { ICycle, IRunnable } from "../types";
import { IMessage } from 'iotacat-sdk-core'
import { bytesToHex } from 'iotacat-sdk-utils'
import { ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
import { MessageHubDomain } from "./MessageHubDomain";
import { CombinedStorageService } from "../service/CombinedStorageService";
import { LRUCache } from "../util/lru";
import { GroupFiService } from "../service/GroupFiService";
import EventEmitter from "events";
// persist and retrieve message id of all conversation
// in memory maintain the message id of single active conversation
export const ConversationGroupMessageListStorePrefix = 'ConversationDomain.groupMessageList.';
export const EventConversationGroupDataUpdated = 'ConversationDomain.groupDataUpdated';
export const ConversationGroupMessageListChunkSize = 100;
export const ConversationGroupMessageListChunkSplitThreshold = 150;
export interface IConversationGroupMessageList {
    groupId: string;
    messageIds: string[];
    nextKey?: string;
}
@Singleton
export class ConversationDomain implements ICycle, IRunnable {
    @Inject
    private combinedStorageService: CombinedStorageService;
    @Inject
    private groupFiService: GroupFiService;
    private _events: EventEmitter = new EventEmitter();
    private _lruCache: LRUCache<IConversationGroupMessageList> = new LRUCache<IConversationGroupMessageList>(100);
    async getGroupMessageList(groupId: string,key?:string): Promise<IConversationGroupMessageList> {
        const storeKey = this.getGroupMessageListStoreKey(groupId,key);
        const groupMessageList = await this.combinedStorageService.get(storeKey,this._lruCache);
        if (groupMessageList) {
            return groupMessageList;
        } else {
            return {
                groupId,
                messageIds: []
            }
        }
    }
    async handleNewMessageToFirstPartGroupMessageList(groupId: string, messageId: string) {
        let firstChunk = await this.getGroupMessageList(groupId);
        firstChunk.messageIds.push(messageId);
        if (firstChunk.messageIds.length > ConversationGroupMessageListChunkSplitThreshold) {
            const splitedChunk = {
                groupId,
                messageIds: firstChunk.messageIds.slice(0, ConversationGroupMessageListChunkSize),
                nextKey: firstChunk.nextKey
            }
            const key = bytesToHex(this.groupFiService.getObjectId(splitedChunk),true);
            firstChunk = {
                groupId,
                messageIds: firstChunk.messageIds.slice(ConversationGroupMessageListChunkSize),
                nextKey: key
            }
            setTimeout(() => {
                this.combinedStorageService.setSingleThreaded(this.getGroupMessageListStoreKey(groupId, key), splitedChunk, this._lruCache);
            }, 0);
        }
        await this.combinedStorageService.setSingleThreaded(this.getGroupMessageListStoreKey(groupId), firstChunk, this._lruCache);
        const eventKey = `${EventConversationGroupDataUpdated}.${groupId}`;
        this._events.emit(eventKey);
    }
    onGroupDataUpdated(groupId: string, callback: () => void) {
        const eventKey = `${EventConversationGroupDataUpdated}.${groupId}`;
        this._events.on(eventKey, callback);
    }
    offGroupDataUpdated(groupId: string, callback: () => void) {
        const eventKey = `${EventConversationGroupDataUpdated}.${groupId}`;
        this._events.off(eventKey, callback);
    }
    getGroupMessageListStoreKey(groupId: string, key?: string) {
        const suffix = key ? `.${key}` : '';
        return `${ConversationGroupMessageListStorePrefix}${groupId}${suffix}`;        
    }
    async poll(): Promise<boolean> {
        const message = this._inChannel.poll();
        if (message) {
            const { groupId, messageId} = message;
            await this.handleNewMessageToFirstPartGroupMessageList(groupId, messageId);
            return false;
        } else {
            return true;
        }

    }
    private threadHandler: ThreadHandler;
    private _inChannel: Channel<IMessage>;
    @Inject
    private messageHubDomain: MessageHubDomain;
    async bootstrap() {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'ConversationDomain', 1000);
        this._inChannel = this.messageHubDomain.outChannelToConversation;
    }
    
    async start() {
        this.threadHandler.start();
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
        //@ts-ignore
        this._lruCache = undefined;
    }
}