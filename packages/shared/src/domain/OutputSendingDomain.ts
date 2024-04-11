import { Channel } from "../util/channel";
import { ICycle, IFullfillOneMessageLiteCommand, IJoinGroupCommand, IMessage, IOutputCommandBase, IRunnable, ISendMessageCommand, ILeaveGroupCommand, IEnterGroupCommand, ProxyMode, DelegationMode, ImpersonationMode, ShimmerMode} from "../types";
import { ThreadHandler } from "../util/thread";
import { GroupFiService } from "../service/GroupFiService";
import { sleep } from "iotacat-sdk-utils";
import EventEmitter from "events";
import { GroupMemberDomain } from "./GroupMemberDomain";
import { Inject, Singleton } from "typescript-ioc";
import { MessageResponseItem } from "iotacat-sdk-core";
import { EventSourceDomain } from "./EventSourceDomain";
import { ProxyModeDomain } from "./ProxyModeDomain";
import { Mode } from '../types'

export const PublicKeyChangedEventKey = 'OutputSendingDomain.publicKeyChanged';
export const NotEnoughCashTokenEventKey = 'OutputSendingDomain.notEnoughCashToken';
export const HasEnoughCashTokenEventKey = 'OutputSendingDomain.hasEnoughCashToken'
export const AquiringPublicKeyEventKey = 'OutputSendingDomain.aquiringPublicKey';
export const RegisteringPairXEventKey = 'OutputSendingDomain.registeringPairX';
export const HasPairXEventKey = 'OutputSendingDomain.hasPairXEventKey'
export const NotHasPairXEventKey = 'OutputSendingDomain.notHasPairXEventKey'
export const CompleteSMRPurchaseEventKey = 'OutputSendingDomain.completeSMRPurchaseEventKey'
export const MessageSentEventKey = 'OutputSendingDomain.messageSent';
export const FullfilledOneMessageLiteEventKey = 'OutputSendingDomain.fullfilledOneMessageLite';
@Singleton
export class OutputSendingDomain implements ICycle, IRunnable {
    
    @Inject
    private groupMemberDomain: GroupMemberDomain;
    @Inject
    private groupFiService: GroupFiService;

    @Inject
    private eventSourceDomain: EventSourceDomain;

    @Inject
    private proxyModeDomain: ProxyModeDomain

    private _isHasPublicKey: boolean = false;
    private _isHasEnoughCashToken: boolean = false;
    private _publicKey:string|undefined;
    private _isPairXRegistered: boolean = false
    private _isSMRPurchaseCompleted: boolean = false
    private _events:EventEmitter = new EventEmitter();
    on(key:string,callback:(event:any)=>void) {
        this._events.on(key,callback)
    }
    off(key:string,callback:(event:any)=>void) {
        this._events.off(key,callback)
    }
    once(key:string,callback:(event:any)=>void) {
        this._events.once(key,callback)
    }
    
    onHasEnoughCashTokenOnce(callback: (event: any) => void) {
        this.once(HasEnoughCashTokenEventKey, callback)
        return () => this.off(HasEnoughCashTokenEventKey, callback)
    }
    onNotHasEnoughCashTokenOnce(callback: (event: any) => void) {
        this.once(NotEnoughCashTokenEventKey, callback)
        return () => this.off(NotEnoughCashTokenEventKey, callback)
    }
    onAquiringPublicKeyEventKeyOnce(callback: (event: any) => void) {
        this.once(AquiringPublicKeyEventKey, callback)
        return () => this.off(AquiringPublicKeyEventKey, callback)
    }
    onPublicKeyChangedOnce(callback: (event: any) => void) {
        this.once(PublicKeyChangedEventKey, callback)
        return () => this.off(PublicKeyChangedEventKey, callback)
    }
    // get
    get isHasPublicKey() {
        return this._isHasPublicKey;
    }
    get isHasEnoughCashToken() {
        return this._isHasEnoughCashToken;
    }
    private _inChannel: Channel<IOutputCommandBase<number>>
    async bootstrap(): Promise<void> {
        this.eventSourceDomain.setOutputSendingDomain(this);
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'OutputSendingDomain', 1000);
        this._inChannel = new Channel<IOutputCommandBase<number>>();
        this.cacheClear();
        
        // log
        console.log('OutputSendingDomain bootstraped');
    }
    cacheClear() {
        this._isHasPublicKey = false;
        this._isHasEnoughCashToken = false;
        this._publicKey = undefined;
        this._isPairXRegistered = false
        this._isSMRPurchaseCompleted = false
    }
    _lastEmittedNotEnoughCashTokenEventTime:number = 0;
    async checkBalanceAndPublicKey() {
        const tasks:Promise<any>[] = []
        if (!this._isHasEnoughCashToken) {
            tasks.push(this.groupFiService.fetchAddressBalance())
        }
        if (!this._isHasPublicKey) {
            tasks.push(this.groupFiService.loadAddressPublicKey())
        }
        if (tasks.length === 0) return true;
        const res = await Promise.all(tasks)
        if (!this._isHasEnoughCashToken) {
            const balance = res.shift();
            console.log('OutputSendingDomain checkIfHasEnoughCashToken, balance:', balance);
            if (balance >= 10*1000*1000) {
                this._isHasEnoughCashToken = true;
                this._events.emit(HasEnoughCashTokenEventKey)
            } else {
                const now = Date.now();
                if (now - this._lastEmittedNotEnoughCashTokenEventTime > 9000) {
                    this._lastEmittedNotEnoughCashTokenEventTime = now;
                    // emit event
                    this._events.emit(NotEnoughCashTokenEventKey);
                }
            }
        }
        if (!this._isHasPublicKey) {
            const publicKey = res.shift();
            console.log('OutputSendingDomain checkIfHasPublicKey, publicKey:', publicKey);
            if (publicKey) {
                this._isHasPublicKey = true;
                this._publicKey = publicKey;
                this._events.emit(PublicKeyChangedEventKey)
            } else {
                if (this._isHasEnoughCashToken) {
                    const cmd = {
                        type: 1,
                        sleepAfterFinishInMs: 2000
                    };
                    this._inChannel.push(cmd);
                }
            }
        }
        
        return this._isHasEnoughCashToken && this._isHasPublicKey;
    }

    _lastTryAquirePublicKeyTime:number = 0;
    // check if has public key
    async _tryAquirePublicKey() {
        // log
        console.log('OutputSendingDomain _tryAquirePublicKey');
        const now = Date.now();
        const diff = now - this._lastTryAquirePublicKeyTime;
        // log now lastTryAquirePublicKeyTime and diff
        console.log(now,this._lastTryAquirePublicKeyTime,diff);
        if (diff < 15000) return false;
        this._lastTryAquirePublicKeyTime = Date.now();
        // emit event
        this._events.emit(AquiringPublicKeyEventKey);
        // send to self
        await this.groupFiService.sendAnyOneToSelf();
        return true;
    }
    
    joinGroup(groupId:string){
        const cmd:IJoinGroupCommand = {
            type:2,
            sleepAfterFinishInMs:2000,
            groupId
        }
        this._inChannel.push(cmd)
    }
    leaveGroup(groupId: string) {
        const cmd: ILeaveGroupCommand = {
            type: 6,
            sleepAfterFinishInMs: 2000,
            groupId
        }
        this._inChannel.push(cmd)
    }
    enterGroup(groupId: string) {
        const cmd: IEnterGroupCommand = {
            type: 7,
            sleepAfterFinishInMs: 1000,
            groupId
        }
        this._inChannel.push(cmd)
    }
    async sendMessageToGroup(groupId:string,message:string): Promise<{ messageSent: IMessage, blockId: string }>
    {
        return new Promise((resolve,reject)=>{
            const cmd:ISendMessageCommand = {
                type:4,
                sleepAfterFinishInMs:0,
                groupId,
                message
            }
            this._inChannel.push(cmd)
            this.once(MessageSentEventKey,(event:any)=>{
                if (event.status === 0) {
                    resolve(event.obj)
                } else {
                    reject(event.message)
                }
            })
        })
    }
    async fullfillOneMessageLite(message: MessageResponseItem) : Promise<IMessage>
     {
        return new Promise((resolve,reject)=>{
            const cmd:IFullfillOneMessageLiteCommand = {
                type:5,
                sleepAfterFinishInMs:0,
                message
            }
            this._inChannel.push(cmd)
            this._events.once(FullfilledOneMessageLiteEventKey,(event:any)=>{
                if (event.status === 0) {
                    resolve(event.obj)
                } else {
                    reject(event.message)
                }
            })
        })
    }

    private threadHandler: ThreadHandler;
    async start() {
        this.threadHandler.start();
    }

    async resume() {
        this.threadHandler.resume();
    }

    async pause() {
        this.threadHandler.pause();
    }

    async stop() {
        this.threadHandler.stop();
    }

    async destroy() {
        this.threadHandler.destroy();
    }

    async poll(): Promise<boolean> {
        const cmd = this._inChannel.poll();
        if (cmd) {
            console.log('OutputSendingDomain command received', cmd);
            if (cmd.type === 1) {
                await this._tryAquirePublicKey();
                await sleep(cmd.sleepAfterFinishInMs);
            } else if (cmd.type === 2) {
                if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as IJoinGroupCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                await this.groupFiService.joinGroup({groupId,memberList,publicKey:this._publicKey!})
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 4) {
                if (!this._isHasPublicKey) {
                    this._events.emit(MessageSentEventKey,{status:-1, message:'no public key'})
                    return false;
                }
                const {groupId,message,sleepAfterFinishInMs} = cmd as ISendMessageCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                const res = await this.groupFiService.sendMessageToGroup(groupId,message,memberList);
                this._events.emit(MessageSentEventKey,{status:0, obj:res})
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 5) {
                if (!this._isHasPublicKey) {
                    this._events.emit(FullfilledOneMessageLiteEventKey,{status:-1, message:'no public key'})
                    return false;
                }
                const {message,sleepAfterFinishInMs} = cmd as IFullfillOneMessageLiteCommand;
                
                try {
                    const res = await this.groupFiService.fullfillOneMessageLite(message);
                    this._events.emit(FullfilledOneMessageLiteEventKey,{status:0, obj:res})
                }catch(error) {
                    this._events.emit(FullfilledOneMessageLiteEventKey, { status: 99999, message: `Parse message from ouptput: ${message.outputId} error` })
                }

                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 6) {
                if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as ILeaveGroupCommand;
                await this.groupFiService.leaveOrUnMarkGroup(groupId);
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 7) {
                const {groupId, sleepAfterFinishInMs} = cmd as IEnterGroupCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                await this.groupFiService.preloadGroupSaltCache(groupId,memberList);
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 8) {
                await this._tryRegisterPairX();
                await sleep(cmd.sleepAfterFinishInMs);
            }
            return false;
        }

        if (this.proxyModeDomain.isProxyMode()) {
            const isPairXRegistered = await this.checkIsPairXRegistered()
            if (!isPairXRegistered) return true
        }
        const isCashEnoughAndHasPublicKey = await this.checkBalanceAndPublicKey();
        if (!isCashEnoughAndHasPublicKey) return true;
        const isPrepareRemainderHint = await this.groupFiService.prepareRemainderHint();
        if (!isPrepareRemainderHint) return true;
        return true
    }

    _lastEmittedNotHasPairXEventTime:number = 0;
    async checkIsPairXRegistered() {
        if (!this._isPairXRegistered) {
            const modeInfo = await this.proxyModeDomain.getModeInfoFromStorageAndService()
            console.log('===> checkIsPairXRegistered modeInfo', modeInfo)
            const mode = this.proxyModeDomain.getMode()
            // proxy address is undefined, indicates a user does't register pairX
            if (modeInfo.detail !== undefined) {
                if (mode === DelegationMode) {
                    this.groupFiService.setDelegationModeProxyAddress(modeInfo.detail.account)
                }
                this._isPairXRegistered = true
                this._events.emit(HasPairXEventKey);

                this._isHasPublicKey = true
                this._events.emit(PublicKeyChangedEventKey)

                return true
            } else {
                if (mode === DelegationMode) {
                    const cmd = {
                        type: 8,
                        sleepAfterFinishInMs: 1000
                    }
                    this._inChannel.push(cmd)
                } else if (mode === ImpersonationMode) {
                    if (!this._isSMRPurchaseCompleted) {
                        const balance = await this.groupFiService.fetchAddressBalance()
                        if (balance >= 10*1000*1000) {
                            this._isSMRPurchaseCompleted = true
                            this._events.emit(CompleteSMRPurchaseEventKey)

                            this._isHasEnoughCashToken = true
                            this._events.emit(HasEnoughCashTokenEventKey)

                            const cmd = {
                                type: 8,
                                sleepAfterFinishInMs: 1000
                            }
                            this._inChannel.push(cmd)
                        }
                    }
                }
                const now = Date.now();
                if (now - this._lastEmittedNotHasPairXEventTime > 9000) {
                    this._lastEmittedNotHasPairXEventTime = now;
                    // emit event
                    this._events.emit(NotHasPairXEventKey);
                }
                return false
            }
        }
        return true
    }

    _lastTryRegisterPairXTime: number = 0

    async _tryRegisterPairX () {
        const now = Date.now()
        const diff = now - this._lastTryRegisterPairXTime
        if (diff < 15000) return false

        this._lastTryRegisterPairXTime = now
        this._events.emit(RegisteringPairXEventKey);

        const modeInfo = await this.proxyModeDomain.getModeInfoFromStorageAndService()
        await this.groupFiService.registerPairX(modeInfo)
    }
}