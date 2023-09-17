import { Inject, Singleton } from "typescript-ioc";
import { IMessage } from 'iotacat-sdk-core'

import { LocalStorageRepository } from "../repository/LocalStorageRepository";

import { MessageHubDomain } from "./MessageHubDomain";
import { GroupFiProtocolService } from "../service/GroupFiService";
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

    @Inject
    private groupFiProtocolService: GroupFiProtocolService;

    async bootstrap() {
        await this.groupFiProtocolService.bootstrap()
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
    private _isLoadingFromApi = false;
    async catchUpFromApi() {
        if (this._isLoadingFromApi) {
            return;
        }
        this._isLoadingFromApi = true;
        try {
            const {messageList,nextToken} = await this.groupFiProtocolService.getInboxMessages(this.anchor);
            await this.handleIncommingMessage(messageList, false);
            if (nextToken) {
                await this._updateAnchor(nextToken);
                await this.catchUpFromApi();
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._isLoadingFromApi = false;
        }
    }

    async startListenningNewMessage() {
    }
}