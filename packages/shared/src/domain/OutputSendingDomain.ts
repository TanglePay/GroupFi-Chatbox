import { Channel } from "../util/channel";
import { ICycle, IJoinGroupCommand, IOutputCommandBase, IRunnable } from "../types";
import { ThreadHandler } from "../util/thread";
import { GroupFiService } from "../service/GroupFiService";
import { sleep } from "iotacat-sdk-utils";
import EventEmitter from "events";
import { GroupMemberDomain } from "./GroupMemberDomain";
import { Inject, Singleton } from "typescript-ioc";
import { off } from "process";

export const PublicKeyChangedEventKey = 'OutputSendingDomain.publicKeyChanged';
@Singleton
export class OutputSendingDomain implements ICycle, IRunnable {
    
    @Inject
    private groupMemberDomain: GroupMemberDomain;
    @Inject
    private groupFiService: GroupFiService;
    private _isHasPublicKey: boolean = false;
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
    // get
    get isHasPublicKey() {
        return this._isHasPublicKey;
    }
    private _inChannel: Channel<IOutputCommandBase<number>>
    async bootstrap(): Promise<void> {
        this.threadHandler = new ThreadHandler(this.poll.bind(this), 'OutputSendingDomain', 1000);
        this._inChannel = new Channel<IOutputCommandBase<number>>();
        this.cacheClear();
        this.checkIfHasPublicKey();
        // log
        console.log('OutputSendingDomain bootstraped');
    }
    cacheClear() {
        this._isHasPublicKey = false;
        this._publicKey = undefined;
    }
    checkIfHasPublicKey() {
        const cmd = {
            type: 1,
            sleepAfterFinishInMs: 2000
        };
        this._inChannel.push(cmd);
        // log
        console.log('OutputSendingDomain checkIfHasPublicKey');
    }
    private _checkIfHasPublicKeyTimeoutHandle: NodeJS.Timeout | undefined;
    // check if has public key
    async _checkIfHasPublicKey() {
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
            // send to self
            await this.groupFiService.sendAnyOneToSelf();
            
            this._checkIfHasPublicKeyTimeoutHandle = setTimeout(() => {
                // log
                console.log('OutputSendingDomain checkIfHasPublicKey timeout');
                this._checkIfHasPublicKeyTimeoutHandle = undefined;
                this.checkIfHasPublicKey();
            }, 9000);
            
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
                if (this._checkIfHasPublicKeyTimeoutHandle) {
                    // log
                    console.log('OutputSendingDomain checkIfHasPublicKey timeout handle cleared');
                    clearTimeout(this._checkIfHasPublicKeyTimeoutHandle);
                    this._checkIfHasPublicKeyTimeoutHandle = undefined;
                }
                await this._checkIfHasPublicKey();
                await sleep(cmd.sleepAfterFinishInMs);
            } else if (cmd.type === 2) {
            if (!this._isHasPublicKey) return false;
                const {groupId, sleepAfterFinishInMs} = cmd as IJoinGroupCommand;
                const memberList = await this.groupMemberDomain.getGroupMember(groupId)??[];
                await this.groupFiService.joinGroup({groupId,memberList,publicKey:this._publicKey!})
                await sleep(sleepAfterFinishInMs);
            }
            return false;
        }
        return true
    }
}