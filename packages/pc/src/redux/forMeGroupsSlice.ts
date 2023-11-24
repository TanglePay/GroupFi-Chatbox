import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { GroupInfo } from './types'

export interface ForMeGroupsState {
  groups: GroupInfo[]
}

const initialState: ForMeGroupsState = {
  groups: []
}

export const forMeGroupsSlice = createSlice({
  name: 'forMeGroups',
  initialState,
  reducers: {
    setForMeGroups(state, action: PayloadAction<GroupInfo[]>) {
      state.groups = action.payload
    }
  }
})

export const { setForMeGroups } = forMeGroupsSlice.actions

export default forMeGroupsSlice.reducer
