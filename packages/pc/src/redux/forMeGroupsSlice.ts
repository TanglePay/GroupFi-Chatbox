import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { GroupInfo } from './types'

export interface ForMeGroupsState {
  groups: GroupInfo[]
  includes: string[] | undefined
  excludes: string[] | undefined
}

const initialState: ForMeGroupsState = {
  groups: [],
  includes: undefined,
  excludes: undefined
}

export const forMeGroupsSlice = createSlice({
  name: 'forMeGroups',
  initialState,
  reducers: {
    setForMeGroups(state, action: PayloadAction<GroupInfo[]>) {
      state.groups = action.payload
    },
    setIncludes(state, action: PayloadAction<string[] | undefined>) {
      state.includes = action.payload
    },
    setExcludes(state, action: PayloadAction<string[] | undefined>) {
      state.excludes = action.payload
    }
  }
})

export const { setForMeGroups, setIncludes, setExcludes } =
  forMeGroupsSlice.actions

export default forMeGroupsSlice.reducer
