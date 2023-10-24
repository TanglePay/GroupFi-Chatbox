import { Inject, Singleton } from "typescript-ioc";
import { IMessage } from 'iotacat-sdk-core'
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
    
    private _newMessageBuffer: IMessage[] = [];
    async bootstrap() {
        
        // this.messageHubDomain.onNewMessage(this.handleNewMessage.bind(this));
    }
    handleNewMessage(message: IMessage) {
        this._newMessageBuffer.push(message);
        this.tryStartProcessNewMessage();
    }
    tryStartProcessNewMessage() {
    }
    async loadFromLocalStorage() {
    }
    getInbox() {

    }
}
