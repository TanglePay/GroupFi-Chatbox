import { Inject, Singleton } from "typescript-ioc";
import { IMessage } from 'iotacat-sdk-core'
import { EventEmitter } from "events";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { LRUCache } from "../util/lru";
// maintain <messageId, message> kv store, with in memory lru cache, plus local storage backup
// only message id should be passed around other domains, message should be retrieved from this domain
@Singleton
export class MessageHubDomain {

    @Inject
    private localStroageRepository: LocalStorageRepository;
    private _events: EventEmitter = new EventEmitter();

    private _lruCache:LRUCache<IMessage>
    onNewMessage(callback: (message: IMessage) => void) {
        this._events.on('newMessage', callback);
    }
    async bootstrap() {
        this._lruCache = new LRUCache<IMessage>(50);
    }

    async storeMessage(message: IMessage[]) {

        for (const m of message) {
            // store to lru cache
            this._lruCache.put(m.messageId, m);
            // store to local storage
            this.localStroageRepository.set(m.messageId, JSON.stringify(m));
            this._events.emit('newMessage', m);
        }
    }
}
