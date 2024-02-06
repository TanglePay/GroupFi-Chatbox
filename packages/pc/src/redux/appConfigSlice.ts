import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AppConfig {
  activeTab: string
  nickName: { name: string } | undefined
}

const initialState: AppConfig = {
  activeTab: 'forMe',
  nickName: undefined
}

export const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    changeActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload
    },
    setNickName(state, action: PayloadAction<{ name: string } | undefined>) {
      state.nickName = action.payload
    }
  }
})

export const { changeActiveTab, setNickName } = appConfigSlice.actions

export default appConfigSlice.reducer
