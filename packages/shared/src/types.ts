
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
}
export interface IInboxGroup {
    groupId: string;
    groupName?: string;
    latestMessage?: IInboxMessage;
    unreadCount: number;
}
export { IMessage } from "iotacat-sdk-core";
