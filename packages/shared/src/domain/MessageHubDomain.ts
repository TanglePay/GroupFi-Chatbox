import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
// maintain <messageId, message> kv store, with in memory lru cache, plus local storage backup
// only message id should be passed around other domains, message should be retrieved from this domain
@Singleton
export class MessageHubDomain {
    
}
