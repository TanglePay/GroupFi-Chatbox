import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
import { EventEmitter } from "events";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
// maintain <messageId, message> kv store, with in memory lru cache, plus local storage backup
// only message id should be passed around other domains, message should be retrieved from this domain
@Singleton
export class MessageHubDomain {

    @Inject
    private localStroageRepository: LocalStorageRepository;
    private _events: EventEmitter = new EventEmitter();

    onNewMessage(callback: (message: IMessage) => void) {
        this._events.on('newMessage', callback);
    }
    async bootstrap() {
        // init lru cache
    }

    async storeMessage(message: IMessage[]) {

        for (const m of message) {
            // store to lru cache
            // store to local storage
            this.localStroageRepository.set(m.messageId, JSON.stringify(m));
            delete m.message;
            this._events.emit('newMessage', m);
        }
    }
}
