import { WalletType } from 'groupfi_chatbox_shared'

export interface GroupInfo {
  groupId: string
  groupName: string
  qualifyType: string
}

export interface WalletInfo {
  walletType: WalletType
}
