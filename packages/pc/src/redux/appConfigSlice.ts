import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AppConfig {
  activeTab: string
}

const initialState: AppConfig = {
  activeTab: 'forMe'
}

export const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    changeActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload
    }
  }
})

export const { changeActiveTab } = appConfigSlice.actions

export default appConfigSlice.reducer
