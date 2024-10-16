import { Mode, WalletType } from 'groupfi-sdk-chat'

export interface GroupInfo {
  groupId: string
  groupName: string
  qualifyType: string
}

export interface WalletInfo {
  walletType: WalletType
}

export interface NodeInfo {
  address: string
  mode: Mode
  nodeId?: number
}

export interface UIConfig {
  title?: string
  subTitle?: string
  logoUrl?: string
}
