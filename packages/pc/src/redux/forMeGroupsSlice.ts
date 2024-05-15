import 'immer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { IIncludesAndExcludes } from 'groupfi_trollbox_shared'

import { GroupInfo } from './types'

export interface ForMeGroupsState {
  groups: GroupInfo[] | undefined
  includes: IIncludesAndExcludes[] | undefined
  excludes: IIncludesAndExcludes[] | undefined
}

const initialState: ForMeGroupsState = {
  groups: undefined,
  includes: undefined,
  excludes: undefined
}

export const forMeGroupsSlice = createSlice({
  name: 'forMeGroups',
  initialState,
  reducers: {
    setForMeGroups(state, action: PayloadAction<GroupInfo[] | undefined>) {
      state.groups = action.payload
    },
    setIncludes(state, action: PayloadAction<IIncludesAndExcludes[] | undefined>) {
      state.includes = action.payload
    },
    setExcludes(state, action: PayloadAction<IIncludesAndExcludes[] | undefined>) {
      state.excludes = action.payload
    }
  }
})

export const { setForMeGroups, setIncludes, setExcludes } =
  forMeGroupsSlice.actions

export default forMeGroupsSlice.reducer
