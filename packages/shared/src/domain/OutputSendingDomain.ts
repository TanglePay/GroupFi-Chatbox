import { Channel } from "../util/channel";
import { ICycle, IFullfillOneMessageLiteCommand, IJoinGroupCommand, IMessage, IOutputCommandBase, IRunnable, ISendMessageCommand, ILeaveGroupCommand, IEnterGroupCommand, IMarkGroupCommend, IVoteGroupCommend, IMuteGroupMemberCommend, ProxyMode, DelegationMode, ImpersonationMode, ShimmerMode} from "../types";
import { ThreadHandler } from "../util/thread";
import { GroupFiService } from "../service/GroupFiService";
import { sleep } from "iotacat-sdk-utils";
import EventEmitter from "events";
import { GroupMemberDomain } from "./GroupMemberDomain";
import { Inject, Singleton } from "typescript-ioc";
import { MessageResponseItem } from "iotacat-sdk-core";
import { EventSourceDomain } from "./EventSourceDomain";
import { ProxyModeDomain } from "./ProxyModeDomain";
import { UserProfileDomain } from "./UserProfileDomain";
import { Mode } from '../types'

export const PublicKeyChangedEventKey = 'OutputSendingDomain.publicKeyChanged';
export const NotEnoughCashTokenEventKey = 'OutputSendingDomain.notEnoughCashToken';
export const HasEnoughCashTokenEventKey = 'OutputSendingDomain.hasEnoughCashToken'
export const AquiringPublicKeyEventKey = 'OutputSendingDomain.aquiringPublicKey';
export const PairXChangedEventKey = 'OutputSendingDomain.pairXChanged'
export const DelegationModeNameNftChangedEventKey = 'OutputSendingDomain.NameNftChanged'
export const MessageSentEventKey = 'OutputSendingDomain.messageSent';
export const FullfilledOneMessageLiteEventKey = 'OutputSendingDomain.fullfilledOneMessageLite';
export const VoteOrUnVoteGroupLiteEventKey = 'OutputSendingDomain.voteOrUnvoteGroupChangedLite'
export const MuteOrUnMuteGroupMemberLiteEventKey = 'OutputSendingDomain.muteOrUnMuteGroupMemberChangedLite'
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

    @Inject
    private UserProfileDomian: UserProfileDomain

    private _isHasPublicKey: boolean = false;
    private _isHasEnoughCashToken: boolean = false;
    private _publicKey:string|undefined;
    private _isHasPairX: boolean = false
    // isReadyToChat
    private _isReadyToChat: boolean = false
    get isReadyToChat() {
        return this._isReadyToChat
    }
    private _isHasDelegationModeNameNft: boolean = false
    private _mode: Mode | undefined = undefined
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
    get isHasPairX() {
        return this._isHasPairX
    }
    get isHasDelegationModeNameNft() {
        return this._isHasDelegationModeNameNft
    }
    get isModeReady() {
        return this._isHasPublicKey || this._isHasPairX
    }

    private _inChannel: Channel<IOutputCommandBase<number>>
    async bootstrap(): Promise<void> {
        this.eventSourceDomain.setOutputSendingDomain(this);
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'OutputSendingDomain', 100);
        this._inChannel = new Channel<IOutputCommandBase<number>>();
        
        // log
        console.log('OutputSendingDomain bootstraped');
    }

    _lastEmittedNotEnoughCashTokenEventTime:number = 0;
    async checkBalance() {
        if (!this._isHasEnoughCashToken) {
            const balance = await this.groupFiService.fetchAddressBalance()
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
        return this._isHasEnoughCashToken
    }

    _lastDidCheckTime:number = 0
    didChanged(){
        this._lastDidCheckTime = 0;
    }
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
    leaveGroup(groupId: string, isUnMark: boolean) {
        const cmd: ILeaveGroupCommand = {
            type: 6,
            sleepAfterFinishInMs: 2000,
            groupId,
            isUnMark
        }
        this._inChannel.push(cmd)
    }
    markGroup(groupId: string) {
        const cmd: IMarkGroupCommend = {
            type: 9,
            sleepAfterFinishInMs: 2000,
            groupId
        }
        this._inChannel.push(cmd)
    }
    voteOrUnvoteGroup(groupId: string, vote: number | undefined) {
        const cmd: IVoteGroupCommend = {
            type: 10,
            sleepAfterFinishInMs: 2000,
            groupId,
            vote
        }
        this._inChannel.push(cmd)
    }
    muteOrUnmuteGroupMember(groupId: string, address: string, isMuteOperation: boolean) {
        const cmd: IMuteGroupMemberCommend = {
            type: 11,
            sleepAfterFinishInMs: 2000,
            groupId, 
            address,
            isMuteOperation
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
        this._mode = this.proxyModeDomain.getMode()
        this._isHasPublicKey = false;
        this._isHasEnoughCashToken = false;
        this._publicKey = undefined;
        this._isHasPairX = false
        this._isHasDelegationModeNameNft = false
        this._isReadyToChat = false
        
        this.threadHandler.start();
    }

    async resume() {
        this.threadHandler.resume();
    }

    async pause() {
        this.threadHandler.pause();
    }

    async stop() {
        this._lastTryRegisterPairXTime = 0
        this._isTryingRegisterPairX = false
        this._lastEmittedNotHasDelegationModeNameNftTime = 0
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
                //TODO
                //if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as IJoinGroupCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                const isEvm = this.proxyModeDomain.getMode() !== ShimmerMode
                const param = {groupId,memberList,publicKey:this._publicKey!,qualifyList:undefined as any}
                if (isEvm) {
                    const qualifyList = await this.groupMemberDomain.getGroupEvmQualify(groupId)
                    param.qualifyList = qualifyList
                }
                await this.groupFiService.joinGroup(param)
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 4) {
                /*
                if (!this._isHasPublicKey) {
                    this._events.emit(MessageSentEventKey,{status:-1, message:'no public key'})
                    return false;
                }*/
                const {groupId,message,sleepAfterFinishInMs} = cmd as ISendMessageCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                const res = await this.groupFiService.sendMessageToGroup(groupId,message,memberList);
                this._events.emit(MessageSentEventKey,{status:0, obj:res})
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 5) {
                /*
                if (!this._isHasPublicKey) {
                    this._events.emit(FullfilledOneMessageLiteEventKey,{status:-1, message:'no public key'})
                    return false;
                }*/
                const {message,sleepAfterFinishInMs} = cmd as IFullfillOneMessageLiteCommand;
                
                try {
                    const res = await this.groupFiService.fullfillOneMessageLite(message);
                    this._events.emit(FullfilledOneMessageLiteEventKey,{status:0, obj:res})
                }catch(error) {
                    this._events.emit(FullfilledOneMessageLiteEventKey, { status: 99999, message: `Parse message from ouptput: ${message.outputId} error` })
                }

                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 6) {
                //if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as ILeaveGroupCommand;
                await this.groupFiService.leaveOrUnMarkGroup(groupId);
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 7) {
                const {groupId, sleepAfterFinishInMs} = cmd as IEnterGroupCommand;
                // log enterGroup command
                console.log('OutputSendingDomain poll, enterGroup, groupId:', groupId);
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                // log
                console.log('OutputSendingDomain poll, enterGroup, memberList:', memberList);
                const isSelfInMemberList = memberList.some((item) => item.addr === this.groupFiService.getCurrentAddress())
                // log isSelfInMemberList
                console.log('OutputSendingDomain poll, enterGroup, isSelfInMemberList:', isSelfInMemberList);
                if (isSelfInMemberList) {
                    await this.groupFiService.preloadGroupSaltCache(groupId,memberList);
                }
                const isEvm = this.proxyModeDomain.getMode() !== ShimmerMode
                if (isEvm) {
                    const qualifyList = await this.groupMemberDomain.getGroupEvmQualify(groupId)
                    // log qualifyList
                    console.log('OutputSendingDomain poll, enterGroup, qualifyList:', qualifyList);
                    const selfAddr = this.groupFiService.getCurrentAddress()
                    const isSelfInQualifyList = qualifyList && qualifyList.some((item) => item.addr === selfAddr)
                    // log isSelfInQualifyList
                    console.log('OutputSendingDomain poll, enterGroup, isSelfInQualifyList:', isSelfInQualifyList);
                    if (qualifyList && !isSelfInQualifyList) {
                       const {addressKeyList,isSelfInList,signature} = await this.groupFiService.getGroupEvmQualifiedList(groupId)
                        if (isSelfInList) {
                            // log fixing group evm qualify
                            const addressList = addressKeyList.map((item) => item.addr)
                            console.log('OutputSendingDomain poll, fixing group evm qualify, groupId:', groupId);
                            const qualifyOutput = await this.groupFiService.getEvmQualify(groupId, addressList, signature)
                            await this.groupFiService.sendAdHocOutput(qualifyOutput)
                        }
                    }
                }
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 8) {
                await this._tryRegisterPairX();
                await sleep(cmd.sleepAfterFinishInMs);
            } else if (cmd.type === 9) {
                const {groupId,sleepAfterFinishInMs} = cmd as IMarkGroupCommend;
                await this.groupFiService.markGroup(groupId)
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 10) {
                const {groupId,sleepAfterFinishInMs, vote} = cmd as IVoteGroupCommend
                const res = await this.groupFiService.voteOrUnVoteGroup(groupId, vote)
                this._events.emit(VoteOrUnVoteGroupLiteEventKey, {outputId: res.outputId, groupId})
                await sleep(sleepAfterFinishInMs)
            } else if (cmd.type === 11) {
                const {groupId, address, sleepAfterFinishInMs, isMuteOperation } = cmd as IMuteGroupMemberCommend
                let res
                if (isMuteOperation) {
                    res = await this.groupFiService.muteGroupMember(groupId, address)
                } else {
                    res = await this.groupFiService.unMuteGroupMember(groupId, address)
                }
                this._events.emit(MuteOrUnMuteGroupMemberLiteEventKey, {groupId, address})
                await sleep(sleepAfterFinishInMs)
            }
            return false;
        }

        await this.checkIfHasPairX()

        const isDelegationModeOk = await this.checkDelegationMode()
        if (!isDelegationModeOk) return true

        const isCashEnough = await this.checkBalance()
        if (!isCashEnough) return true

        // const isDelegationNameNftOk = await this.

        const isShimmerModeOk = await this.checkShimmerMode()
        if (!isShimmerModeOk) return true

        const isImpersonationModeOk = await this.checkImpersonationMode()
        if (!isImpersonationModeOk) return true

        const isHasDelegationModeNameNft = await this.checkDelegationModeNameNft()
        if (!isHasDelegationModeNameNft) return true

        this._isReadyToChat = true
        const isPrepareRemainderHint = await this.groupFiService.prepareRemainderHint();
        if (!isPrepareRemainderHint) return true;
        return true
    }

    async checkIfHasPairX() {
        if (this._mode === ShimmerMode) {
            return
        } 
        if (!this._isHasPairX) {
            const modeInfo = this.proxyModeDomain.modeInfo
            console.log("OutputSendingDomain checkIfhasPairX, modeInfo:", modeInfo)
            this._isHasPairX = modeInfo.detail !== undefined
            if (this._isHasPairX) {
                this.groupFiService.setProxyModeInfo(modeInfo)
                this._events.emit(PairXChangedEventKey)
            }
        }
    }

    async checkShimmerMode() {
        if (this._mode !== ShimmerMode) {
            return true
        }
        if (!this._isHasPublicKey) {
            const publicKey = await this.groupFiService.loadAddressPublicKey()
            console.log('OutputSendingDomain checkIfHasPublicKey, publicKey:', publicKey);
            if (publicKey) {
                this._isHasPublicKey = true;
                this._publicKey = publicKey;
                this._events.emit(PublicKeyChangedEventKey)
            } else {
                const cmd = {
                    type: 1,
                    sleepAfterFinishInMs: 2000
                };
                this._inChannel.push(cmd);
            }
        }
        return this._isHasPublicKey
    }

    private _lastEmittedNotHasDelegationModeNameNftTime: number = 0
    async checkDelegationModeNameNft() {
        if (this._mode !== DelegationMode) {
            return true
        }
        const diff = Date.now() - this._lastDidCheckTime
        if (!this._isHasDelegationModeNameNft && diff > 1000 * 3) {
            const currentAddress = this.groupFiService.getCurrentAddress()
            const res = await this.UserProfileDomian.getOneBatchUserProfile([currentAddress])
            console.log("OutputSendingDomain checkIshasNameNft, res", res)
            if (res[currentAddress]) {
                this._isHasDelegationModeNameNft = true
                this._events.emit(DelegationModeNameNftChangedEventKey)
            } else {
                const now = Date.now()
                if (now - this._lastEmittedNotHasDelegationModeNameNftTime > 9000) {
                    this._lastEmittedNotHasDelegationModeNameNftTime = now
                    this._events.emit(DelegationModeNameNftChangedEventKey)
                }
            }    
        }
        return this._isHasDelegationModeNameNft
    }

    async checkImpersonationMode() {
        if (this._mode !== ImpersonationMode) {
            return true
        }
        if (!this._isHasPairX) {
            const cmd = {
                type: 8,
                sleepAfterFinishInMs: 2000
            }
            this._inChannel.push(cmd)
        }
        return this._isHasPairX
    }

    async checkDelegationMode() {
        if (this._mode !== DelegationMode) {
            return true
        }
        if (!this._isHasPairX) {
            const cmd = {
                type: 8,
                sleepAfterFinishInMs: 2000
            }
            this._inChannel.push(cmd)
        }
        return this._isHasPairX
    }

    _lastTryRegisterPairXTime: number = 0
    _isTryingRegisterPairX: boolean = false
    async _tryRegisterPairX () {
        if (this._isTryingRegisterPairX) {
            return true
        }
        const now = Date.now()
        const diff = now - this._lastTryRegisterPairXTime
        if (diff < 1000*60*2) return false

        this._isTryingRegisterPairX = true

        const modeInfo = this.proxyModeDomain.modeInfo
        console.log('register very start', Date.now())
        await this.groupFiService.registerPairX(modeInfo)
        this._isTryingRegisterPairX = false
        this._lastTryRegisterPairXTime = now
        console.log('register end', Date.now())
    }
}