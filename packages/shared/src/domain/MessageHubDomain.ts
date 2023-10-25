import { Inject, Singleton } from "typescript-ioc";
import { IMessage } from 'iotacat-sdk-core'
import { EventEmitter } from "events";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { LRUCache } from "../util/lru";
import { ICycle, IRunnable } from "../types";
import { IContext, ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
import { MessageSourceDomain } from "./MessageSourceDomain";
import { CombinedStorageService } from "../service/CombinedStorageService";
// maintain <messageId, message> kv store, with in memory lru cache, plus local storage backup
// only message id should be passed around other domains, message should be retrieved from this domain
export const MessageStorePrefix = 'MessageHubDomain.message.';
@Singleton
export class MessageHubDomain implements ICycle, IRunnable {

    @Inject
    private combinedStorageService: CombinedStorageService;

    private threadHandler: ThreadHandler;
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
    getMessageKey(messageId: string) {
        return `${MessageStorePrefix}${messageId}`;
    }
    async poll(): Promise<boolean> {
        // poll from in channel
        const message = await this._inChannel.poll();
        if (message) {
            // log message received
            console.log('MessageHubDomain message received', message);
            this.combinedStorageService.setSingleThreaded(this.getMessageKey(message.messageId), message,this._lruCache);

            this._outChannelToInbox.push({...message});
            this._outChannelToConversation.push({...message});
            
            return false;
        } else {
            return true;
        }
    }

    @Inject
    private messageSourceDomain: MessageSourceDomain;

    private _lruCache:LRUCache<IMessage>
    private _outChannelToInbox: Channel<IMessage>;
    get outChannelToInbox(): Channel<IMessage> {
        return this._outChannelToInbox;
    }
    private _outChannelToConversation: Channel<IMessage>;
    get outChannelToConversation(): Channel<IMessage> {
        return this._outChannelToConversation;
    }
    private _inChannel: Channel<IMessage>;
    async bootstrap() {
        this._lruCache = new LRUCache<IMessage>(50);
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'MessageHubDomain', 1000);
        this._outChannelToInbox = new Channel<IMessage>();
        this._outChannelToConversation = new Channel<IMessage>();
        this._inChannel = this.messageSourceDomain.outChannel;
    }

    
    async getMessage(messageId: string): Promise<IMessage | undefined | null> {
        return await this.combinedStorageService.get(this.getMessageKey(messageId), this._lruCache);
    }
}
