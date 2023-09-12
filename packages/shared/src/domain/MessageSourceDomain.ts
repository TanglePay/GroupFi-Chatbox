import { Inject, Singleton } from "typescript-ioc";
import { IotaShimmerService } from "../service/IotaShimmerService";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { MqttPushService } from "../service/MqttPushService";
import { InxApiRepository } from "../repository/InxApiRepository";
import { MessageHubDomain } from "./MessageHubDomain";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain

const anchorKey = 'messageSourceDomain.anchor';

@Singleton
export class MessageSourceDomain {
    
    private anchor: string;

    @Inject
    private messageHubDomain: MessageHubDomain;

    @Inject
    private localStorageRepository: LocalStorageRepository;

    
    async bootstrap() {
        const anchor = await this.localStorageRepository.get(anchorKey);
        if (anchor) {
            this.anchor = anchor;
        }
    }
    async _updateAnchor(anchor: string) {
        this.anchor = anchor;
    }
    async handleIncommingMessage(messages: IMessage[], isFromPush: boolean) {
        await this.messageHubDomain.storeMessage(messages);
        if (isFromPush) {
            await this.catchUpFromApi();
        } else {
            let largestAnchor = "";
            await this._updateAnchor(largestAnchor);
        }
    }
    async catchUpFromApi() {
    }

    async startListenningNewMessage() {
    }
}