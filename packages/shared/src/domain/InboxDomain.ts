import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
// maintain list of groupid, order matters
// maintain state of each group, including group name, last message, unread count, etc
// restore from local storage on start, then update on new message from inbox message hub domain
@Singleton
export class InboxDomain {
    
}
