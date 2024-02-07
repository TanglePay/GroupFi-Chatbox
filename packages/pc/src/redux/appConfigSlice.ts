import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { UserProfileInfo } from 'groupfi_trollbox_shared'

export interface AppConfig {
  activeTab: string
  userProfile: UserProfileInfo | undefined
}

const initialState: AppConfig = {
  activeTab: 'forMe',
  userProfile: undefined
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
    }
  }
})

export const { changeActiveTab, setUserProfile } = appConfigSlice.actions

export default appConfigSlice.reducer
