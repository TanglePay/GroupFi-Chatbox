import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  UserProfileInfo,
  MetaMaskWallet,
  TanglePayWallet
} from 'groupfi_chatbox_shared'
import { NodeInfo, WalletInfo } from './types'
import { ACTIVE_TAB_KEY, setLocalParentStorage } from 'utils/storage'
export interface AppConfig {
  activeTab: string
  userProfile: UserProfileInfo | undefined
  walletInfo: WalletInfo | undefined
  metaMaskAccountFromDapp: string | undefined
  isBrowseMode: boolean
  nodeInfo: NodeInfo | undefined
}

const SUPPORTED_WALLET_TYPE_MAP: {
  [key: string]: typeof TanglePayWallet | typeof MetaMaskWallet
} = {
  tanglepay: TanglePayWallet,
  metamask: MetaMaskWallet
}

function getInitWalletInfoFromUrl(): WalletInfo | undefined {
  const searchParams = new URLSearchParams(window.location.search)
  const walletType = searchParams.get('walletType')

  if (walletType && SUPPORTED_WALLET_TYPE_MAP[walletType.toLowerCase()]) {
    return {
      walletType: SUPPORTED_WALLET_TYPE_MAP[walletType]
    }
  }

  return undefined
}

function getIsBrowseModeFromUrl() {
  const searchParams = new URLSearchParams(window.location.search)
  const isBrowseMode = searchParams.get('isBrowseMode')
  if (isBrowseMode === 'true') {
    return true
  }
  return false
}

const initialState: AppConfig = {
  activeTab: 'forMe',
  userProfile: undefined,
  walletInfo: getInitWalletInfoFromUrl(),
  metaMaskAccountFromDapp: undefined,
  isBrowseMode: getIsBrowseModeFromUrl(),
  nodeInfo: undefined
}

export const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    changeActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload || 'forMe'
      setLocalParentStorage(ACTIVE_TAB_KEY, action.payload, state.nodeInfo)
    },
    setUserProfile(state, action: PayloadAction<UserProfileInfo | undefined>) {
      state.userProfile = action.payload
    },
    setWalletInfo(state, action: PayloadAction<WalletInfo | undefined>) {
      if (
        action.payload?.walletType === MetaMaskWallet &&
        state.metaMaskAccountFromDapp !== undefined
      ) {
        state.metaMaskAccountFromDapp = undefined
      }
      state.walletInfo = action.payload
    },
    setMetaMaskAccountFromDapp(
      state,
      action: PayloadAction<string | undefined>
    ) {
      state.metaMaskAccountFromDapp = action.payload
    },
    setNodeInfo(state, action: PayloadAction<NodeInfo | undefined>) {
      state.nodeInfo = action.payload
    },
    setIsBrowseMode(state, action: PayloadAction<boolean>) {
      state.isBrowseMode = action.payload
    }
  }
})

export const {
  changeActiveTab,
  setUserProfile,
  setWalletInfo,
  setMetaMaskAccountFromDapp,
  setNodeInfo,
  setIsBrowseMode
} = appConfigSlice.actions

export default appConfigSlice.reducer
