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
    timestamps: number[];
    headKey?: string;
    tailKey?: string;
}
export type MessageFetchDirection = 'head' | 'tail';
export const HeadKey = 'head';
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
    _storeGroupMessageList(groupId:string,groupMessageList: IConversationGroupMessageList,key:string) {
        const storeKey = this.getGroupMessageListStoreKey(groupId,key);
        this.combinedStorageService.setSingleThreaded(storeKey, groupMessageList, this._lruCache);
    }
    async getGroupMessageList(groupId: string,key:string): Promise<IConversationGroupMessageList> {
        const storeKey = this.getGroupMessageListStoreKey(groupId,key);
        const groupMessageList = await this.combinedStorageService.get(storeKey,this._lruCache);
        if (groupMessageList) {
            return groupMessageList;
        } else {
            return {
                groupId,
                messageIds: [],
                timestamps: []
            }
        }
    }
    async getMessageList({groupId,key,messageId, direction,size}:{groupId: string, key: string, messageId?:string,direction:MessageFetchDirection, size?: number}): Promise<{
        messages: IMessage[],
        directMostMessageId?: string,
        chunkKeyForDirectMostMessageId: string
    }> {
        const {
            messageIds,
            directMostMessageId,
            chunkKeyForDirectMostMessageId
        } = await this._getMessageList({groupId,key,messageId, direction,size});
        const messages = await Promise.all(messageIds.map(async (messageId) => {
            const message = await this.messageHubDomain.getMessage(messageId);
            return message;
        }));
        // messages = messages filter out null or undefined
        let messagesFiltered = messages.filter((message) => message) as IMessage[];
        return {
            messages:messagesFiltered,
            directMostMessageId,
            chunkKeyForDirectMostMessageId
        }
    }
    // getMessageList， given a group id, optionally a key of chunk, optionally a message id, optionally a size, return a list of message id, last message id, and key of chunk of last message id
    async _getMessageList({groupId,key,messageId,direction,size=10}:{groupId: string, key: string, messageId?:string, direction: MessageFetchDirection, size?: number}): Promise<{
        messageIds: string[],
        directMostMessageId?: string,
        chunkKeyForDirectMostMessageId: string
    }> {
        // log arguments
        console.log('_getMessageList', arguments);
        // resolve key for message id when first chunk
        if (messageId && key == HeadKey) {
            key = await this._resolveKeyForMessageIdFromTailDirect(groupId,messageId,key);
        }

        let currentChunkKey = key;
        let currentChunk = await this.getGroupMessageList(groupId,currentChunkKey);
        // log currentChunk
        console.log('currentChunk', currentChunk);
        let anchorIndex = direction === 'head' ? -1 : currentChunk.messageIds.length;
        if (messageId) {
            const index = currentChunk.messageIds.indexOf(messageId);
            if (index > -1) {
                anchorIndex = index;
            }
        }
        const messageIdsToReturn = [];
        while (messageIdsToReturn.length < size) {
            // update anchorIndex based on direction
            if (direction === 'head') {
                anchorIndex++;
            } else {
                anchorIndex--;
            }
            // check if anchorIndex is out of bound
            if (anchorIndex < 0 || anchorIndex >= currentChunk.messageIds.length) {
                // if out of bound, check if there's next chunk
                if (direction === 'head' && currentChunk.headKey) {
                    // if there's next chunk, get next chunk
                    currentChunkKey = currentChunk.headKey;
                    currentChunk = await this.getGroupMessageList(groupId,currentChunkKey);
                    anchorIndex = 0;
                } else if (direction === 'tail' && currentChunk.tailKey) {
                    // if there's previous chunk, get previous chunk
                    currentChunkKey = currentChunk.tailKey;
                    currentChunk = await this.getGroupMessageList(groupId,currentChunkKey);
                    anchorIndex = currentChunk.messageIds.length - 1;
                } else {
                    // if no next chunk, return
                    break;
                }
            }
            const messageId = currentChunk.messageIds[anchorIndex];
            messageIdsToReturn.push(messageId);
        }
        // directMostMessageId is last message id in messageIdsToReturn, or undefined if messageIdsToReturn is empty
        const directMostMessageId = messageIdsToReturn.length > 0 ? messageIdsToReturn[messageIdsToReturn.length - 1] : undefined;
        // chunkKeyForDirectMostMessageId is currentChunkKey
        const chunkKeyForDirectMostMessageId = currentChunkKey;
        return {
            messageIds: messageIdsToReturn,
            directMostMessageId,
            chunkKeyForDirectMostMessageId
        }

        
    }

    async _resolveKeyForMessageIdFromTailDirect(groupId:string,messageId: string, assumingKey: string) {
        let currentKey = assumingKey;
        for (;;) {
            const groupMessageList = await this.getGroupMessageList(groupId,assumingKey);
            const { messageIds, tailKey } = groupMessageList;
            const isExist = messageIds.indexOf(messageId) > -1;
            if (isExist) {
                return currentKey;
            }
            if (!tailKey) throw new Error('message id not found');
            currentKey = tailKey;
        }
    }

    _getKeyOfChunk(chunk:IConversationGroupMessageList) {
        const { headKey, tailKey, ...rest } = chunk;
        return bytesToHex(this.groupFiService.getObjectId(rest),true);
    }
    async handleNewMessageToFirstPartGroupMessageList(groupId: string, messageId: string, timestamp: number) {
        let firstChunk = await this.getGroupMessageList(groupId,HeadKey);

        // 最新的 push 到最后
        const messageIds = [];
        const timestamps = [];
        let inserted = false;
        for (let i = 0; i < firstChunk.messageIds.length; i++) {
            // firstChunk.timestamps is asending order
            if (!inserted && timestamp < firstChunk.timestamps[i]) {
                messageIds.push(messageId);
                timestamps.push(timestamp);
                inserted = true;
            }
            messageIds.push(firstChunk.messageIds[i]);
            timestamps.push(firstChunk.timestamps[i]);
        }
        if (!inserted) {
            messageIds.push(messageId);
            timestamps.push(timestamp);
        }
        firstChunk.messageIds = messageIds;
        firstChunk.timestamps = timestamps;
        const firstChunkMessageIdsLen = firstChunk.messageIds.length
        if (firstChunkMessageIdsLen > ConversationGroupMessageListChunkSplitThreshold) {
            const splitedChunk = {
                groupId,
                messageIds: firstChunk.messageIds.slice(0, ConversationGroupMessageListChunkSize),
                timestamps: firstChunk.timestamps.slice(0, ConversationGroupMessageListChunkSize),
            } as IConversationGroupMessageList;
            const key = this._getKeyOfChunk(splitedChunk);
            // head chunk of splited chunk should be first chunk, hence headKey is HeadKey
            // if tail chunk of first chunk is not null, then need to update tail chunk's headKey, and split chunk's tailKey is tail chunk's key
            if (firstChunk.tailKey) {
                const previousTailKey = firstChunk.tailKey;
                const tailChunk = await this.getGroupMessageList(groupId, previousTailKey);
                
                tailChunk.headKey = key;
                firstChunk.tailKey = key;
                splitedChunk.tailKey = previousTailKey;
                splitedChunk.headKey = HeadKey;
                // save tail chunk
                this._storeGroupMessageList(groupId,tailChunk,previousTailKey);
            }

            this._storeGroupMessageList(groupId,splitedChunk,key);
            firstChunk = {
                groupId,
                messageIds: firstChunk.messageIds.slice(ConversationGroupMessageListChunkSize),
                timestamps: firstChunk.timestamps.slice(ConversationGroupMessageListChunkSize),
                tailKey: key
            }
        }
        this._storeGroupMessageList(groupId,firstChunk,HeadKey);
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