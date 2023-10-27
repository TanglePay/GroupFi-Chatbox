import { Inject, Singleton } from "typescript-ioc";
import { IMessage } from 'iotacat-sdk-core'

import { LocalStorageRepository } from "../repository/LocalStorageRepository";

import { MessageHubDomain } from "./MessageHubDomain";
import { GroupFiService } from "../service/GroupFiService";
import { ICycle, IRunnable } from "../types";
import { IContext, Thread, ThreadHandler } from "../util/thread";
import { Channel } from "../util/channel";
// act as a source of new message, notice message is write model, and there is only one source which is one addresse's inbox message
// maintain anchor of inbox message inx api call
// fetch new message on requested(start or after new message pushed), update anchor
// maintain mqtt connection, handle pushed message
// persist message to MessageDataDomain, and emit message id to inbox domain and ConversationDomain

const anchorKey = 'messageSourceDomain.anchor';

@Singleton
export class MessageSourceDomain implements ICycle,IRunnable{
    
    
    
    private anchor: string;

    @Inject
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private groupFiService: GroupFiService;

    private _outChannel: Channel<IMessage>;
    get outChannel() {
        return this._outChannel;
    }
    private threadHandler: ThreadHandler;
    async bootstrap() {        
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'MessageSourceDomain', 15000);
        this._outChannel = new Channel<IMessage>();
        const anchor = await this.localStorageRepository.get(anchorKey);
        if (anchor) {
            this.anchor = anchor;
        }
        // log MessageSourceDomain bootstraped
        console.log('MessageSourceDomain bootstraped');
    }
    async start() {
        this.threadHandler.start();
        // log MessageSourceDomain started
        console.log('MessageSourceDomain started');
    }

    async resume() {
        this.threadHandler.resume();
        // log MessageSourceDomain resumed
        console.log('MessageSourceDomain resumed');
    }

    async pause() {
        this.stopListenningNewMessage();
        this.threadHandler.pause();
        // log MessageSourceDomain paused
        console.log('MessageSourceDomain paused');
    }

    async stop() {
        this.threadHandler.stop();
        // log MessageSourceDomain stopped
        console.log('MessageSourceDomain stopped');
    }

    async destroy() {
        this.threadHandler.destroy();
        // log MessageSourceDomain destroyed
        console.log('MessageSourceDomain destroyed');
    }
    
    async poll(): Promise<boolean> {
        // log MessageSourceDomain poll
        console.log('MessageSourceDomain poll');
        return await this.catchUpFromApi();
    }
    
    async _updateAnchor(anchor: string) {
        this.anchor = anchor;
        await this.localStorageRepository.set(anchorKey, anchor);
    }
    private _waitIntervalAfterPush = 3000;
    async handleIncommingMessage(messages: IMessage[], isFromPush: boolean) {
        for (const message of messages) {
            this._outChannel.push(message);
        }
        if (isFromPush) {
            setTimeout(() => {
                this.threadHandler.forcePauseResolve()
            }, this._waitIntervalAfterPush);
        }
    }
    private _isLoadingFromApi = false;
    private _isStartListenningNewMessage = false;
    async catchUpFromApi(): Promise<boolean> {
        if (this._isLoadingFromApi) {
            // log MessageSourceDomain catchUpFromApi skip
            console.log('MessageSourceDomain catchUpFromApi skip _isLoadingFromApi is true');
            return true;
        }
        this._isLoadingFromApi = true;
        try {
            console.log('****Enter message source domain catchUpFromApi')
            const {messageList,nextToken} = await this.groupFiService.getInboxMessages(this.anchor);
            console.log('***messageList', messageList)
            await this.handleIncommingMessage(messageList, false);
            if (nextToken) {
                await this._updateAnchor(nextToken);
                return false;
            } else {
                if (!this._isStartListenningNewMessage) {
                    this.startListenningNewMessage();
                    this._isStartListenningNewMessage = true;
                }
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._isLoadingFromApi = false;
            
        }
        return true;
    }

    startListenningNewMessage() {
        this.groupFiService.onNewMessage(this._onNewMessage.bind(this));
    }
    stopListenningNewMessage() {
        this.groupFiService.offNewMessage();
    }
    _onNewMessage(message: IMessage) {
        // log MessageSourceDomain _onNewMessage
        console.log('MessageSourceDomain _onNewMessage', message);
        this.handleIncommingMessage([message], true);
    }


}