// src/types.ts
export interface ApiError {
    statusCode: number;
    message: string;
    details?: string;
  }
// Define the request type
export interface WorkerRequest {
    type: string;
    address: string;
    mnemonic?: string;  // Add mnemonic for bootstrap
    groupId?: string;
    includes?: any[];
    excludes?: any[];
    message?: string;
    key?: string;
    messageId?: string;
    direction?: 'head' | 'tail'; // Adjusted to match MessageFetchDirection type
    size?: number;
}


// Define the response type
export interface WorkerResponse {
    status: string;
    address?: string;
    groupId?: string;
    message?: string;
    result?: any;
    forMeGroupList?: any[];
    myGroupList?: any[];
    messageList?: any[];
    sendMessageResult?: any;
}

// Define the error type
export interface WorkerError {
    status: 'error';
    message: string;
}
  