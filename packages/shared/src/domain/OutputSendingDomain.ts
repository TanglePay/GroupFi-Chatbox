import { Channel } from "../util/channel";
import { ICycle, IFullfillOneMessageLiteCommand, IJoinGroupCommand, IMessage, IOutputCommandBase, IRunnable, ISendMessageCommand, ILeaveGroupCommand, IEnterGroupCommand, IMarkGroupCommend, IVoteGroupCommend, IMuteGroupMemberCommend, ProxyMode, DelegationMode, ImpersonationMode, ShimmerMode, RegisteredInfo, ILikeGroupMemberCommend, ISelectProfileCommand, IRegisterPairXCommand} from "../types";
import { ThreadHandler } from "../util/thread";
import { GroupFiService } from "../service/GroupFiService";
import { LocalStorageRepository } from "../repository/LocalStorageRepository";
import { bytesToHex, sleep, tracer } from "groupfi-sdk-utils";
import EventEmitter from "events";
import { GroupMemberDomain } from "./GroupMemberDomain";
import { Inject, Singleton } from "typescript-ioc";
import { MessageResponseItem } from "groupfi-sdk-core";
import { EventSourceDomain } from "./EventSourceDomain";
import { ProxyModeDomain } from "./ProxyModeDomain";
import { UserProfileDomain } from "./UserProfileDomain";
import { SharedContext } from './SharedContext'
import { Mode, Profile } from '../types'

export const PublicKeyChangedEventKey = 'OutputSendingDomain.publicKeyChanged';
export const NotEnoughCashTokenEventKey = 'OutputSendingDomain.notEnoughCashToken';
export const HasEnoughCashTokenEventKey = 'OutputSendingDomain.hasEnoughCashToken'
export const AquiringPublicKeyEventKey = 'OutputSendingDomain.aquiringPublicKey';
export const PairXChangedEventKey = 'OutputSendingDomain.pairXChanged'
export const DelegationModeNameNftChangedEventKey = 'OutputSendingDomain.NameNftChanged'
export const MessageSentEventKey = 'OutputSendingDomain.messageSent';
export const FullfilledOneMessageLiteEventKey = 'OutputSendingDomain.fullfilledOneMessageLite';
export const VoteOrUnVoteGroupLiteEventKey = 'OutputSendingDomain.voteOrUnvoteGroupChangedLite'

const profileKey = 'OutputSendingDomain.profileList'
export const ProfileListChangedEventkey = 'OutputSendingDomain.profileListChanged' 

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
    private localStorageRepository: LocalStorageRepository;

    @Inject
    private UserProfileDomian: UserProfileDomain

    @Inject
    private _context: SharedContext;

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
    private _profileList: Profile[] | undefined | null = undefined
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
        if (this._mode === DelegationMode) {
            return true
        }
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
    likeOrUnLikeGroupMember(groupId: string, address: string, isLikeOperation: boolean) {
        const cmd : ILikeGroupMemberCommend = {
            type: 13,
            sleepAfterFinishInMs: 2000,
            groupId, 
            address,
            isLikeOperation
        }  
        this._inChannel.push(cmd)
    }
    enterGroup(groupId: string) {
        if (!this._context.walletAddress) {
            return 
        }
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

    setProfile(profile: Profile, shouldMint: boolean) {
        const cmd: ISelectProfileCommand = {
            type: 14,
            profile,
            shouldMint,
            sleepAfterFinishInMs: 2000
        }
        this._inChannel.push(cmd)
    }

    private threadHandler: ThreadHandler;

    async _loadProfileList() {
        const profileList = await this.localStorageRepository.get(profileKey)
        console.log('_loadProfileList from local', profileList)
        if (profileList !== null) {
            this._profileList = JSON.parse(profileList)
            this._trySetProfileContext('profile context from local')
            this._lastRefreshProfileListTime = Date.now()
        }
    }

    async start() {
        this._mode = this.proxyModeDomain.getMode()
        this._isHasPublicKey = false;
        this._isHasEnoughCashToken = false;
        this._publicKey = undefined;
        this._isHasPairX = false
        this._isHasDelegationModeNameNft = false
        this._isReadyToChat = false

        this._lastTimeLoadProxyAddressAndPairX = 0
        this._context.clearPairX('outputSendingDomain', 'thread start')
        this._context.clearProxyAddress('outputSendingDomain', 'thread start')
        this._context.clearEncryptedPairX('outputSendingDomain', 'thread start')
        // this._context.clearName('outputSendingDomain', 'thread start')
        this._context.clearProfile('outputSendingDomain', 'thread start')
        this._context.clearEncryptionPublicKey('outputSendingDomain', 'thread start')
        this._context.clearSignature('outputSendingDomain', 'thread start')
        this._context.clearUserBrowseMode('outputSendingDomain', 'thread start')
        this._isNeedToStoreRegister = false
        this._registerInfoToStore = {}
        this._isDelegationModeProxyModeInfoSet = false
        this._isImpersonationModeProxyModeInfoSet = false

        this._lastRefreshProfileListTime = 0
        this._isRefreshingProfileList = false
        await this._loadProfileList()
        
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
        await this.threadHandler.drainAndStop();
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
                    console.log('===>Join qualifyList', qualifyList)
                    param.qualifyList = qualifyList
                    console.log('===>Join param', param)
                }
                await this.groupFiService.joinGroup(param)
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 4) {
                tracer.startStep('sendMessageToGroup', 'OutputSendingDomain poll, sendMessageToGroup cmd received')
                const {groupId,message,sleepAfterFinishInMs} = cmd as ISendMessageCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                tracer.startStep('sendMessageToGroup', 'OutputSendingDomain poll, sendMessageToGroup, groupFiService.sendMessageToGroup start calling')
                const isAnnouncement = this.groupMemberDomain.isAnnouncementGroup(groupId)
                const isGroupPublic = this.groupMemberDomain.isGroupPublicLite(groupId)
                const res = await this.groupFiService.sendMessageToGroup(groupId,message,isAnnouncement,isGroupPublic,
                    memberList);
                if (res) {
                    const {
                        sentMessagePromise,
                        sendBasicOutputPromise,
                    } = res;
                    // trace start await sentMessagePromise
                    tracer.startStep('sendMessageToGroup', 'OutputSendingDomain poll, sendMessageToGroup, sentMessagePromise start await')
                    const sentMessage = await sentMessagePromise;
                    this.eventSourceDomain.handleIncommingMessage([sentMessage],true)
                    // trace start emit MessageSentEventKey
                    tracer.startStep('sendMessageToGroup', 'OutputSendingDomain poll, sendMessageToGroup, sentMessagePromise end await')
                    this._events.emit(MessageSentEventKey,{status:0, obj:{messageSent:sentMessage}})
                    tracer.endStep('sendMessageToGroup', 'OutputSendingDomain poll, sendMessageToGroup, sentMessagePromise end await')
                    console.log(tracer.getLogs())
                    const {blockId,outputId} = await sendBasicOutputPromise;
                    console.log('OutputSendingDomain poll, sendMessageToGroup, blockId:', blockId);
                }
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
                    const {addressKeyList,isSelfInList,signature} = await this.groupFiService.getGroupEvmQualifiedList(groupId)
                    let shouldFix = false
                    if (isSelfInQualifyList && !isSelfInList) {
                        shouldFix = true
                    }
                    if (!isSelfInQualifyList && isSelfInList) {
                        shouldFix = true
                    }
                    // log isSelfInQualifyList, isSelfInList, shouldFix
                    console.log('OutputSendingDomain poll, enterGroup, isSelfInQualifyList:', isSelfInQualifyList, 'isSelfInList:', isSelfInList, 'shouldFix:', shouldFix);
                    if (shouldFix) {
                        // log fixing group evm qualify
                        const addressList = addressKeyList.map((item) => item.addr)
                        console.log('OutputSendingDomain poll, fixing group evm qualify, groupId:', groupId);
                        const timestamp = Date.now()
                        const qualifyOutput = await this.groupFiService.getEvmQualify(groupId, addressList, signature, timestamp)
                        await this.groupFiService.sendAdHocOutput(qualifyOutput)
                    }
                }
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 8) {
                const { encryptionPublicKey } = cmd as IRegisterPairXCommand
                await this._tryRegisterPairX(encryptionPublicKey);
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
                if (isMuteOperation) {
                    await this.groupFiService.muteGroupMember(groupId, address)
                } else {
                    await this.groupFiService.unMuteGroupMember(groupId, address)
                }
                await sleep(sleepAfterFinishInMs)
            } else if (cmd.type === 12) {
                if (!this._context.encryptedPairX) {
                    return false
                }
                const { password, pairX } = await this.groupFiService.login(this._context.encryptedPairXObj!)
                if (pairX) {
                    this._context.setPairX(pairX, 'login cmd', 'login success')
                    return false
                }
                const registerPairXCmd: IRegisterPairXCommand = {
                    type: 8,
                    sleepAfterFinishInMs: 2000,
                    encryptionPublicKey: password
                }
                this._inChannel.push(registerPairXCmd)
                // await this._tryRegisterPairX(password)
                // await sleep(cmd.sleepAfterFinishInMs)
            } else if (cmd.type === 13) {
                const { groupId, address, isLikeOperation, sleepAfterFinishInMs } = cmd as ILikeGroupMemberCommend
                if (isLikeOperation) {
                    await this.groupFiService.likeGroupMember(groupId, address)
                } else {
                    await this.groupFiService.unlikeGroupMember(groupId, address)
                }
                await sleep(sleepAfterFinishInMs)
            } else if (cmd.type === 14) {
                const { profile, sleepAfterFinishInMs, shouldMint } = cmd as ISelectProfileCommand
                await Promise.all([this.groupFiService.setProfile(profile), shouldMint ? this.groupFiService.mintProxyNicknameNft(profile.name) : undefined])
                await sleep(sleepAfterFinishInMs)
            }
            return false;
        }

        if (!this._context.isWalletConnected) {
            return true
        }

        this.tryRefreshProfileList()
        await this._tryLoadProxyAddressAndPairX()

        const isDelegationModeOk = this.checkDelegationMode()
        if (!isDelegationModeOk) return true
        
        const isCashEnough = await this.checkBalance()
        if (!isCashEnough) return true

        const isShimmerModeOk = await this.checkShimmerMode()
        if (!isShimmerModeOk) return true

        const isImpersonationModeOk = await this.checkImpersonationMode()
        if (!isImpersonationModeOk) return true
        
        this._tryStoreRegiserInfo()

        // this._tryGetDelegationModeNameNft()
        
        const isHasDelegationModeNameNft = await this.checkDelegationModeNameNft()
        if (!isHasDelegationModeNameNft) return true

        this._isReadyToChat = true
        const isPrepareRemainderHint = await this.groupFiService.prepareRemainderHint();
        if (!isPrepareRemainderHint) return true;
        return true
    }

    _isCanLoadProxyAddressAndPairX() {
        return this._mode !== ShimmerMode && !this._context.userBrowseMode && this._context.walletAddress 
    }

    _lastTimeLoadProxyAddressAndPairX: number = 0
    _isShouldLoadProxyAddressAndPairX() {
        if (Date.now() - this._lastTimeLoadProxyAddressAndPairX < 1000*2) {
            return false
        }
        return !this._context.proxyAddress || !this._context.pairX
    }

    _isNeedToStoreRegister: boolean = false
    _registerInfoToStore: RegisteredInfo = {}

    _tryStoreRegiserInfo() {
        if (this._isNeedToStoreRegister) {
            this._registerInfoToStore = {
                ...this._registerInfoToStore,
                pairX: this._context.pairX!
            }
            this.proxyModeDomain.storeRegisterInfo(this._registerInfoToStore)
            this._isNeedToStoreRegister = false
        }
    }

    async _actualLoadProxyAddressAndPairX() {
        const {detail, pairX} = await this.proxyModeDomain.getModeInfoFromStorage()
        console.log('===>up _actualLoadProxyAddressAndPairX', detail, pairX)
        if (detail?.account && pairX) {
            const isValid = await this._checkIsPairXValid(pairX.publicKey, detail.account)
            console.log('===>up is local pairX valid', isValid)
            
            if (isValid) {
                this._context.setPairX(pairX, 'loadProxyAddressAndPairX', 'initial load from storage')
                this._context.setProxyAddress(detail.account, 'loadProxyAddressAndPairX', 'initial load from storage')
                return
            }
            await this.proxyModeDomain.clearModeInfoFromStorage()
        }
        this._isNeedToStoreRegister = true
        await this.loadProxyAddressAndEncryptedPairXFromService()
    }


    async _tryLoadProxyAddressAndPairX() {
        if (!this._isCanLoadProxyAddressAndPairX()){
            return false
        }
        if (this._isShouldLoadProxyAddressAndPairX()) {
            await this._actualLoadProxyAddressAndPairX();
            this._lastTimeLoadProxyAddressAndPairX = Date.now()
            return true
        }
        return false
    }

    async _checkIsPairXValid(publicKey: string | Uint8Array, proxyAddress: string) {
        if (this._mode !== DelegationMode) {
            return true
        }   
        return await this.groupFiService.checkIsRegisteredInServiceEnv(publicKey, proxyAddress)
    }

    async loadProxyAddressAndEncryptedPairXFromService() {
        console.log('===>up load pairX from service')
        const res = await this.groupFiService.fetchRegisteredInfoV2() 
        if (res) {
            const isValid = await this._checkIsPairXValid(res.publicKey, res.mmProxyAddress)
            console.log('===>up is service pairX valid', isValid)
            if (isValid) {
                this._context.setEncryptedPairX({
                    publicKey: res.publicKey,
                    privateKeyEncrypted: res.privateKeyEncrypted
                }, 'loadProxyAddressAndPairX', 'initial load from service')
                
                if (res['mmProxyAddress']) {
                    this._registerInfoToStore[DelegationMode]={
                        account: res['mmProxyAddress']
                    }
                }
                if (res['tpProxyAddress']) {
                    this._registerInfoToStore[ImpersonationMode] = {
                        account: res['tpProxyAddress']
                    }
                }
                if (this._mode === DelegationMode && res['mmProxyAddress']) {
                    this._context.setProxyAddress(res['mmProxyAddress'], 'loadProxyAddressAndEncryptedPairXFromService', '')
                    console.log('Exec loadProxyAddressAndEncryptedPairXFromService end111')
                    return
                }
                if (this._mode === ImpersonationMode && res['tpProxyAddress']) {
                    this._context.setProxyAddress(res['mmProxyAddress'], 'loadProxyAddressAndEncryptedPairXFromService', '')
                    return
                }
            }
        }
        if (!this._context.proxyAddress) {
            this._context.setProxyAddress('', 'loadProxyAddressAndEncryptedPairXFromService', '')
        }
        if (!this._context.pairX) {
            this._context.setPairX(null, 'loadProxyAddressAndEncryptedPairXFromService', '')
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

    // _isCanGetDelegationModeNameNft() {
    //     return !this._context.name && this._mode === DelegationMode
    // }

    _lastTimeGetDelegationModeNameNft: number = 0
    _isShouldGetDelegationModeNameNft() {
        return Date.now() - this._lastTimeGetDelegationModeNameNft > 2 * 1000;
    }

    _lastRefreshProfileListTime: number = 0

    _isShouldRefreshProfileList() {
        if (this._isRefreshingProfileList) {
            return false
        }
        return this._profileList === undefined || Date.now() - this._lastRefreshProfileListTime > 1000*60*10
    }

    async _actualRefreshProfileList() {
        const { profileList, profileToBeUpdateOnChain } = await this.groupFiService.getAddressProfileList()
        this._profileList = profileList
        console.log('===> tryRefreshProfileList _actualRefreshProfileList res', this._profileList, profileToBeUpdateOnChain)
        this._lastRefreshProfileListTime = Date.now()
        this.localStorageRepository.set(profileKey, JSON.stringify(this._profileList))
        this._trySetProfileContext('profile context from service')

        // TODO, update profile on chain
        if (profileToBeUpdateOnChain) {
            console.log('profile should update on chain', profileToBeUpdateOnChain)
        }
    }

    profileChanged() {
        this._lastRefreshProfileListTime = 0
    }
    
    _isRefreshingProfileList: boolean = false
    async tryRefreshProfileList() {
        if (this._isShouldRefreshProfileList()) {
            this._isRefreshingProfileList = true
            await this._actualRefreshProfileList()
            this._isRefreshingProfileList = false
        }
    }

    getProfileList() {
        return this._profileList
    }

    _trySetProfileContext(why: string) {
        if (this._profileList === undefined) {
            return false
        }
        if (this._profileList?.length) {
            const activeProfile = this._profileList.find(profile => profile.isActive)
            if (activeProfile) {
                this._context.setProfile(activeProfile, 'OutputSendingDomain', why)
                return true
            }
            const groupFiProfile = this._profileList.find(profile => profile.chainId === 148)
            if (groupFiProfile) {
                this._context.setProfile(groupFiProfile, 'OutputSendingDomain', why)
                return true
            }
        }
        this._context.setProfile(null, '_trySetProfileContext', why)
    }

    async checkDelegationModeNameNft() {
        if (this._mode !== DelegationMode) {
            return true
        }
        return !!this._context.getProfile()
    }

    _isImpersonationModeProxyModeInfoSet: boolean = false
    async checkImpersonationMode() {
        if (this._mode !== ImpersonationMode) {
            return true
        }
        const isOk =  !!this._context.proxyAddress && this._context.pairX
        if (isOk && !this._isImpersonationModeProxyModeInfoSet) {
            this.groupFiService.setProxyModeInfo({
                detail:{
                    account: this._context.proxyAddress!,
                },
                pairX: this._context.pairX!
            })
            this._isImpersonationModeProxyModeInfoSet = true
        }
        return isOk
    }

    registerPairX() {
        const cmd: IRegisterPairXCommand = {
            type: 8,
            sleepAfterFinishInMs: 2000
        }
        this._inChannel.push(cmd)
    }

    login() {
        const cmd = {
            type: 12,
            sleepAfterFinishInMs: 2000
        }
        this._inChannel.push(cmd)
        // if (!this._context.encryptedPairX) {
        //     return
        // }
        // const pairX = await this.groupFiService.login(this._context.encryptedPairXObj!)
        // this._context.setPairX(pairX, 'login func', 'user login')
    }

    _isDelegationModeProxyModeInfoSet: boolean = false
    checkDelegationMode() {
        if (this._mode !== DelegationMode) {
            return true
        }
        const isOk = !!this._context.proxyAddress && !!this._context.pairX
        if (isOk && !this._isDelegationModeProxyModeInfoSet) {
            this.groupFiService.setProxyModeInfo({
                pairX: this._context.pairX!,
                detail: {
                    account: this._context.proxyAddress!
                }
            })
            this._isDelegationModeProxyModeInfoSet = true
        }
        return isOk
    }

    _lastTryRegisterPairXTime: number = 0
    _isTryingRegisterPairX: boolean = false
    async _tryRegisterPairX (encryptionPublicKey?: string) {
        const pairX = this._context.pairX
        console.log('_tryRegisterPairX pairX', pairX)

        if (!encryptionPublicKey) {
            encryptionPublicKey = await this.groupFiService.getEncryptionPublicKey()
        }
        this._context.setEncryptionPublicKey(encryptionPublicKey, 'tryRegisterPairX', 'getEncryptionPublicKey')

        const {metadataObjWithSignature, pairX: mustExistedPairX} = await this. groupFiService.signaturePairX(encryptionPublicKey, pairX)
        this._context.setSignature(metadataObjWithSignature.signature, 'tryRegisterPairX', 'signaturePairX')

        await this.groupFiService.registerPairX({
            metadataObjWithSignature,
            pairX: mustExistedPairX
        })

        this._context.setPairX(mustExistedPairX, 'tryRegisterPairX', 'tryRegisterPairX success')
    }
}