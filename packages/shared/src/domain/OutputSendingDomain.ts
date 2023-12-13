import { Channel } from "../util/channel";
import { ICycle, IJoinGroupCommand, IOutputCommandBase, IRunnable } from "../types";
import { ThreadHandler } from "../util/thread";
import { GroupFiService } from "../service/GroupFiService";
import { sleep } from "iotacat-sdk-utils";
import EventEmitter from "events";
import { GroupMemberDomain } from "./GroupMemberDomain";
import { Inject, Singleton } from "typescript-ioc";

export const PublicKeyChangedEventKey = 'OutputSendingDomain.publicKeyChanged';
export const NotEnoughCashTokenEventKey = 'OutputSendingDomain.notEnoughCashToken';
export const HasEnoughCashTokenEventKey = 'OutputSendingDomain.hasEnoughCashToken'
export const AquiringPublicKeyEventKey = 'OutputSendingDomain.aquiringPublicKey';
@Singleton
export class OutputSendingDomain implements ICycle, IRunnable {
    
    @Inject
    private groupMemberDomain: GroupMemberDomain;
    @Inject
    private groupFiService: GroupFiService;
    private _isHasPublicKey: boolean = false;
    private _isHasEnoughCashToken: boolean = false;
    private _publicKey:string|undefined;
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
    }
    checkIfHasPublicKey() {
        if (this._isHasPublicKey) return true;
        // diff from last check time should be greater than 9 seconds
        if (Date.now() - this._lastCheckIfHasPublicKeyTime < 9000) return false;
        const cmd = {
            type: 1,
            sleepAfterFinishInMs: 2000
        };
        this._inChannel.push(cmd);
        // log
        console.log('OutputSendingDomain checkIfHasPublicKey');
        return false;
    }
    checkIfHasEnoughCashToken() {
        if (this._isHasEnoughCashToken) return true;
        // diff from last check time should be greater than 9 seconds
        if (Date.now() - this._lastCheckIfHasEnoughCashTokenTime < 9000) return false;
        const cmd = {
            type: 3,
            sleepAfterFinishInMs: 4000
        };
        this._inChannel.push(cmd);
        // log
        console.log('OutputSendingDomain checkIfHasEnoughCashToken');
        return false;
    }

    _lastCheckIfHasPublicKeyTime:number = 0;
    // check if has public key
    async _checkIfHasPublicKey() {
        this._lastCheckIfHasPublicKeyTime = Date.now();
        const publicKey = await this.groupFiService.loadAddressPublicKey();
        // log
        console.log('OutputSendingDomain checkIfHasPublicKey public key:', publicKey);
        if (publicKey) {
            this._isHasPublicKey = true;
            this._publicKey = publicKey;
            // emit event
            this._events.emit(PublicKeyChangedEventKey,{isHasPublicKey:this.isHasPublicKey});
        } else {
            this._isHasPublicKey = false;
            // emit event
            this._events.emit(AquiringPublicKeyEventKey);
            // send to self
            await this.groupFiService.sendAnyOneToSelf();
        }
    }
    _lastCheckIfHasEnoughCashTokenTime:number = 0;
    async _checkIfHasEnoughCashToken() {
        this._lastCheckIfHasEnoughCashTokenTime = Date.now();
        // log
        console.log('OutputSendingDomain checkIfHasEnoughCashToken');
        const res = await this.groupFiService.getSMRBalance();
        // log
        console.log('OutputSendingDomain checkIfHasEnoughCashToken res:', res);
        const {amount} = res;
        if (amount >= 10*1000*1000) {
            this._isHasEnoughCashToken = true;
            this._events.emit(HasEnoughCashTokenEventKey)
        } else {
            this._isHasEnoughCashToken = false;
            // emit event
            this._events.emit(NotEnoughCashTokenEventKey);
        }
    }

    joinGroup(groupId:string){
        const cmd:IJoinGroupCommand = {
            type:2,
            sleepAfterFinishInMs:2000,
            groupId
        }
        this._inChannel.push(cmd)
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
                await this._checkIfHasPublicKey();
                await sleep(cmd.sleepAfterFinishInMs);
            } else if (cmd.type === 2) {
            if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as IJoinGroupCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                await this.groupFiService.joinGroup({groupId,memberList,publicKey:this._publicKey!})
                await sleep(sleepAfterFinishInMs);
            } else if (cmd.type === 3) {
                await this._checkIfHasEnoughCashToken();
                await sleep(cmd.sleepAfterFinishInMs);
            }
            return false;
        }
        if(!this.checkIfHasEnoughCashToken()) return true;
        if(!this.checkIfHasPublicKey()) return true;
        return true
    }
}