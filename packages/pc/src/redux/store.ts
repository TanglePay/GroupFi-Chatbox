import { configureStore } from '@reduxjs/toolkit'
import forMeGroupsReducer from './forMeGroupsSlice'
import appConfigReducer from './appConfigSlice'

const store = configureStore({
  reducer: {
    forMeGroups: forMeGroupsReducer,
    appConifg: appConfigReducer
  }
})

export default store

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch
