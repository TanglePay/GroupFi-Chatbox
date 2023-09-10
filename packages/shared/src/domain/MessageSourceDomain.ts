import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain
@Singleton
export class MessageSourceDomain {
    @Inject
    private iotaShimmerService: IotaShimmerService;
}