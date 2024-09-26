import { MessageResponseItem } from 'groupfi-sdk-core';
import { DelegationMode, ImpersonationMode, Profile } from 'groupfi-sdk-facade';
import { SharedContext } from './domain/SharedContext';


export { 
    RegisteredInfo,
    PairX, 
    Mode,
    ModeDetail,
    ModeInfo,
    ShimmerMode,
    DelegationMode,
    ImpersonationMode,
    WalletType,
    TanglePayWallet,
    MetaMaskWallet,
    SceneryType,
    TanglePayScenery,
    MetaMaskScenery,
    Profile
} from 'groupfi-sdk-facade'

export { IIncludesAndExcludes } from 'groupfi-sdk-core'

export interface ICycle {
    bootstrap(): Promise<void>; // resource allocation and channel connection
    start(): Promise<void>; // start loop
    resume(): Promise<void>; // unpause loop
    
    pause(): Promise<void>; // pause loop
    stop(): Promise<void>; // drain then stop loop with timeout
    destroy(): Promise<void>; // de allocation
}

export interface IRunnable {
    poll(): Promise<boolean>; // return true if should pause
}

export interface StorageAdaptor {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
// { sender, message, timestamp }
export interface IInboxMessage {
    sender: string;
    message: string;
    timestamp: number;
    name?: string
}
export interface IInboxGroup {
    groupId: string;
    dappGroupId?: string
    latestMessage?: IInboxMessage;
    lastTimeReadLatestMessageTimestamp?: number;
    unreadCount: number;
}
export interface ICommandBase<T extends number> {
    type: T;
}
export interface IClearCommandBase<T extends string> {
    type: T;
}
export interface IAddPendingMessageToFrontCommand extends IClearCommandBase<'addPendingMessageToFront'> {
    oldToNew: MessageResponseItem[]
} 
//  fetch public group message on boot
export interface IFetchPublicGroupMessageCommand extends IClearCommandBase<'publicGroupOnBoot'> {
    groupIds: string[];
}
export interface IInboxRecommendGroup {
    groupId: string
    groupName: string
    qualifyType: string
}
export { IMessage, EventGroupMemberChanged } from "groupfi-sdk-core";

export interface IOutputCommandBase<T> {
    type: T;
    sleepAfterFinishInMs: number;
}

export interface ICheckPublicKeyCommand extends IOutputCommandBase<1> {
}
export interface IJoinGroupCommand extends IOutputCommandBase<2> {
    groupId: string;
}
export interface ICheckCashBalance extends IOutputCommandBase<3> {
}
// send message to group
export interface ISendMessageCommand extends IOutputCommandBase<4> {
    groupId: string;
    message: string;
}
// fullfillOneMessageLite
export interface IFullfillOneMessageLiteCommand extends IOutputCommandBase<5> {
    message: MessageResponseItem
}
// leave a group
export interface ILeaveGroupCommand extends IOutputCommandBase<6> {
    groupId: string,
    isUnMark: boolean
}
// enter a group
export interface IEnterGroupCommand extends IOutputCommandBase<7> {
    groupId: string
}

export interface UserProfileInfo {
    name: string
    avatar?: string
}

export type ProxyMode = typeof ImpersonationMode | typeof DelegationMode

export interface IMarkGroupCommend extends IOutputCommandBase<9>{
    groupId: string
}

export interface IVoteGroupCommend extends IOutputCommandBase<10>{
    groupId: string
    vote: number | undefined
}

export interface IMuteGroupMemberCommend extends IOutputCommandBase<11> {
    groupId: string
    address: string
    isMuteOperation: boolean
}

export interface ILikeGroupMemberCommend extends IOutputCommandBase<13> {
    groupId: string
    address: string
    isLikeOperation: boolean
}

// select a profile
export interface ISelectProfileCommand extends IOutputCommandBase<14> {
    profile: Profile,
    shouldMint: boolean
}

export interface ILoginCommend extends IOutputCommandBase<12> {
    
}

export interface IGroupMemberPollTask {
    maxPollCount?: number,
    sleepAfterFinishInMs?: number,
    groupId: string
    address: string
    isNewMember: boolean
}

// type for user mode, browsing mode, logged in mode
export type UserMode = 'browse' | 'login'

export interface IEncryptedPairX {
    publicKey: string
    privateKeyEncrypted: string
}