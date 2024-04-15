import { WalletType } from 'groupfi_trollbox_shared'

export interface GroupInfo {
  groupId: string
  groupName: string
  qualifyType: string
}

export interface WalletInfo {
  walletType: WalletType
}
