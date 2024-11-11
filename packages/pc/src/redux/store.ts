import { configureStore } from '@reduxjs/toolkit'
import appConfigReducer from './appConfigSlice'

const store = configureStore({
  reducer: {
    appConifg: appConfigReducer
  }
})

export default store

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch
