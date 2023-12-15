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
    cacheClear() {
        if (this._lruCache) {
            this._lruCache.clear();
        }
    }
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
    async getMessageList({groupId,key,startMessageId, untilMessageId,size}:{groupId: string, key?: string, startMessageId?: string, untilMessageId?:string, size?: number}): Promise<{
        messages: IMessage[],
        lastMessageId?: string,
        lastMessageChunkKey?: string
    }> {
        const {
            messageIds,
            lastMessageId,
            lastMessageChunkKey
        } = await this._getMessageList({groupId,key,startMessageId, untilMessageId,size});
        const messages = await Promise.all(messageIds.map(async (messageId) => {
            const message = await this.messageHubDomain.getMessage(messageId);
            return message;
        }));
        // messages = messages filter out null or undefined
        let messagesFiltered = messages.filter((message) => message) as IMessage[];
        return {
            messages:messagesFiltered,
            lastMessageId,
            lastMessageChunkKey
        }
    }
    // getMessageList， given a group id, optionally a key of chunk, optionally a message id, optionally a size, return a list of message id, last message id, and key of chunk of last message id
    async _getMessageList({groupId,key,startMessageId, untilMessageId,size=10}:{groupId: string, key?: string, startMessageId?: string, untilMessageId?:string, size?: number}): Promise<{
        messageIds: string[],
        lastMessageId?: string,
        lastMessageChunkKey?: string
    }> {
        const groupMessageList = await this.getGroupMessageList(groupId,key);
        // log groupId key groupMessageList
        console.log('ConversationDomain _getMessageList', groupId, key, groupMessageList);
        const { messageIds } = groupMessageList;
        const index = startMessageId ? messageIds.indexOf(startMessageId) : -1;
        const start = index > -1 ? (index + 1) : 0;
        const endIndex = untilMessageId ? messageIds.indexOf(untilMessageId) : -1;
        const end = endIndex > -1 ? endIndex : start + size;
        // if end > messageIds.length and there is next chunk, then first fetch start to messageIds.length, then recursively fetch the rest
        if (end > messageIds.length && groupMessageList.nextKey) {
            const firstChunk = messageIds.slice(start);
            const restChunk = await this._getMessageList({groupId, key: groupMessageList.nextKey, size: end - messageIds.length});
            return {
                messageIds: firstChunk.concat(restChunk.messageIds),
                lastMessageId: restChunk.lastMessageId,
                lastMessageChunkKey: restChunk.lastMessageChunkKey
            }
        } else {
            const lastMessageId = messageIds[Math.min(end,messageIds.length) - 1];
            const lastMessageChunkKey = key;
            return {
                messageIds: messageIds.slice(start, end),
                lastMessageId,
                lastMessageChunkKey
            }
        }
        
    }

    async handleNewMessageToFirstPartGroupMessageList(groupId: string, messageId: string, timestamp: number) {
        let firstChunk = await this.getGroupMessageList(groupId);

        // if(firstChunk.messageIds.length > 0 && timestamp > )
        // const latestMessageId = firstChunk.messageIds[0]
        // const latestMessage = latestMessageId !== undefined ? await this.messageHubDomain.getMessage(latestMessageId) : undefined

        // if(latestMessage && timestamp > latestMessage.timestamp) {
        //     firstChunk.messageIds.unshift(messageId)
        // }else{
        //     firstChunk.messageIds.push(messageId)
        // }

        firstChunk.messageIds.push(messageId);

        const firstChunkMessageIdsLen = firstChunk.messageIds.length
        if (firstChunkMessageIdsLen > ConversationGroupMessageListChunkSplitThreshold) {
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
        // log method groupId messageId
        console.log('ConversationDomain handleNewMessageToFirstPartGroupMessageList', groupId, messageId,firstChunk);
        
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
            // log message received
            console.log('ConversationDomain message received', message);
            const { groupId, messageId, timestamp} = message;
            await this.handleNewMessageToFirstPartGroupMessageList(groupId, messageId, timestamp);
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