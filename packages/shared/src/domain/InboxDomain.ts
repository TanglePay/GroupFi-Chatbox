import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MessageHubDomain } from "./MessageHubDomain";
import { MessageSourceDomain } from "./MessageSourceDomain";
// maintain list of groupid, order matters
// maintain state of each group, including group name, last message, unread count, etc
// restore from local storage on start, then update on new message from inbox message hub domain
@Singleton
export class InboxDomain {

    @Inject
    private localStorageRepository: LocalStorageRepository;
    
    @Inject
    private messageHubDomain: MessageHubDomain;

    @Inject
    private messageSourceDomain: MessageSourceDomain;
    
    async bootstrap() {
        // subscribe to message source domain
    }
    async loadFromLocalStorage() {
    }
}
