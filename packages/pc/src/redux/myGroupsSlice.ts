import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { GroupInfo } from './types'

export interface MyGroupsState {
  groups: GroupInfo[]
}

const initialState: MyGroupsState = {
  groups: []
}

export const myGroupsSlice = createSlice({
  name: 'myGroups',
  initialState,
  reducers: {
    setMyGroups(state, action: PayloadAction<GroupInfo[]>) {
      state.groups = action.payload
    },
    addGroup(state, action: PayloadAction<GroupInfo>) {
      if (state.groups.find((g) => g.groupId === action.payload.groupId)) {
        return
      }
      state.groups = [...state.groups, action.payload]
    },
    removeGroup(state, action: PayloadAction<string>) {
      state.groups = state.groups.filter(
        ({ groupId }) => groupId !== action.payload
      )
    }
  }
})

export const { setMyGroups, addGroup, removeGroup } = myGroupsSlice.actions

export default myGroupsSlice.reducer
