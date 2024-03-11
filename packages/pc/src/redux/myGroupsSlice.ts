import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { GroupInfo } from './types'

export interface MyGroupsState {
  groups: GroupInfo[] | undefined
}

const initialState: MyGroupsState = {
  groups: undefined
}

export const myGroupsSlice = createSlice({
  name: 'myGroups',
  initialState,
  reducers: {
    setMyGroups(state, action: PayloadAction<GroupInfo[]>) {
      state.groups = action.payload
    },
    addGroup(state, action: PayloadAction<GroupInfo>) {
      const stateGroups = state.groups ?? []
      if (stateGroups.find((g) => g.groupId === action.payload.groupId)) {
        return
      }
      state.groups = [...stateGroups, action.payload]
    },
    removeGroup(state, action: PayloadAction<string>) {
      const stateGroups = state.groups ?? []
      state.groups = stateGroups.filter(
        ({ groupId }) => groupId !== action.payload
      )
    }
  }
})

export const { setMyGroups, addGroup, removeGroup } = myGroupsSlice.actions

export default myGroupsSlice.reducer
