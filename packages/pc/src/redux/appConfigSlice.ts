import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  UserProfileInfo,
  MetaMaskWallet,
  TanglePayWallet
} from 'groupfi_trollbox_shared'
import { WalletInfo } from './types'

export interface AppConfig {
  activeTab: string
  userProfile: UserProfileInfo | undefined
  walletInfo: WalletInfo | undefined
  metaMaskAccountFromDapp: string | undefined
}

const SUPPORTED_WALLET_TYPE_MAP: {
  [key: string]: typeof TanglePayWallet | typeof MetaMaskWallet
} = {
  tanglepay: TanglePayWallet,
  metamask: MetaMaskWallet
}

function getInitWalletInfo(): WalletInfo | undefined {
  const searchParams = new URLSearchParams(window.location.search)
  const walletType = searchParams.get('walletType')

  if (walletType && SUPPORTED_WALLET_TYPE_MAP[walletType.toLowerCase()]) {
    return {
      walletType: SUPPORTED_WALLET_TYPE_MAP[walletType]
    }
  }

  return undefined
}

const initialState: AppConfig = {
  activeTab: 'forMe',
  userProfile: undefined,
  walletInfo: getInitWalletInfo(),
  metaMaskAccountFromDapp: undefined
}

export const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    changeActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload
    },
    setUserProfile(state, action: PayloadAction<UserProfileInfo | undefined>) {
      state.userProfile = action.payload
    },
    setWalletInfo(state, action: PayloadAction<WalletInfo | undefined>) {
      state.walletInfo = action.payload
    },
    setMetaMaskAccountFromDapp(state, action: PayloadAction<string | undefined>) {
      state.metaMaskAccountFromDapp = action.payload
    }
  }
})

export const { changeActiveTab, setUserProfile, setWalletInfo, setMetaMaskAccountFromDapp } =
  appConfigSlice.actions

export default appConfigSlice.reducer
