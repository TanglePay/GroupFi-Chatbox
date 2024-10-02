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

export interface UiConfig {
  accent?: string,
  title?: string
  subTitle?: string
  logoUrl?: string
  iconPosition?: {
    left?: number
    top?: number
  }
}

export interface LoadChatboxOptions {
  isWalletConnected: boolean
  provider?: any
  theme?: ThemeType
  uiConfig?: UiConfig
}

export type ProcessWalletOptions = Pick<LoadChatboxOptions, 'isWalletConnected' | 'provider'>

export type RenderChatboxOptions = Omit<LoadChatboxOptions, 'provider'> & { isGroupfiNativeMode: boolean }

// export interface RenderChatboxOptions {
//   isWalletConnected: boolean
//   isGroupfiNativeMode: boolean
//   theme?: ThemeType
//   accent?: string
// }
