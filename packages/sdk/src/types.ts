import {JsonRpcId} from "tanglepaysdk-common";

export interface SendToTrollboxParam {
  cmd: string;
  origin?: string;
  data?: any;
  id?: JsonRpcId;
}

export interface TrollboxReadyEventData {
  chatboxVersion: string
}

export type TrollboxResponse<T> = T

export type ThemeType = 'light' | 'dark';

// export interface LoadTrollboxParams {
//   walletType: string
//   theme?: ThemeType
// }
export interface LoadChatboxOptions {
  isWalletConnected: boolean
  provider?: any
  theme?: ThemeType
}

export interface RenderChatboxOptions {
  isWalletConnected: boolean,
  isGroupfiNativeMode: boolean
  theme?: ThemeType
}
