import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MqttPushService } from "../service/MqttPushService";
import { InxApiRepository } from "../repository/InxApiRepository";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain
@Singleton
export class MessageSourceDomain {
    
    private anchor: string;

    @Inject
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private inxApiRepository: InxApiRepository;
    @Inject
    private mqttPushService: MqttPushService;

    
    async bootstrap() {
        // init anchor from local storage
    }
    async catchUpFromApi() {
    }
}