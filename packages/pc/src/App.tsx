import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper } from 'components/Shared'
import { useEffect, createContext, useState } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor } from 'utils'
import { SWRConfig } from 'swr'

import { useAppDispatch, useAppSelector } from './redux/hooks'
import { setForMeGroups } from './redux/forMeGroupsSlice'
import { setMyGroups } from './redux/myGroupsSlice'

import { SDKReceiver, SDKHandler } from './sdk'

import './App.scss'
import './public/index'

const router = createBrowserRouter([
  {
    path: '/',
    async lazy() {
      const Component = (await import('./components/GroupList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id',
    async lazy() {
      const Component = (await import('./components/ChatRoom')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/info',
    async lazy() {
      const Component = (await import('./components/GroupInfo')).default
      return { Component }
    }
  },
  {
    path: 'user/:id',
    async lazy() {
      const Component = (await import('./components/UserInfo')).default
      return { Component }
    }
  }
])

export const AppInitedContext = createContext({
  inited: false
})

function App() {
  const { messageDomain } = useMessageDomain()

  const [inited, setInited] = useState(false)
  const appDispatch = useAppDispatch()

  const includes = useAppSelector((state) => state.forMeGroups.includes)
  const excludes = useAppSelector((state) => state.forMeGroups.excludes)

  console.log('====>includes', includes)
  console.log('====>excludes', excludes)

  const onAccountChanged = (newAddress: string) => {
    loadForMeGroupList({ includes, excludes })
    loadMyGroupList()
    router.navigate('/')
  }

  const fn = async () => {
    await messageDomain.connectWallet()
    await messageDomain.setupGroupFiMqttConnection(connect)
    const adapter = new LocalStorageAdaptor()
    messageDomain.setStorageAdaptor(adapter)

    messageDomain.listenningAccountChanged(onAccountChanged)
    await messageDomain.getGroupFiService().setupIotaMqttConnection(MqttClient)

    setInited(true)

    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
  }

  const loadForMeGroupList = async (params: {
    includes?: string[]
    excludes?: string[]
  }) => {
    const forMeGroups = await messageDomain
      .getGroupFiService()
      .getRecommendGroups(params)
    console.log('===>forMeGroups', forMeGroups)
    appDispatch(setForMeGroups(forMeGroups))
  }

  const loadMyGroupList = async () => {
    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    console.log('===>myGroups', myGroups)
    appDispatch(setMyGroups(myGroups))
  }

  const initSDK = () => {
    const sdkHandler = new SDKHandler(appDispatch)
    const sdkReceiver = new SDKReceiver(sdkHandler)
    return sdkReceiver.listenningMessage()
  }

  useEffect(() => {
    if (inited) {
      loadForMeGroupList({ includes, excludes })
    }
  }, [inited, includes, excludes])

  useEffect(() => {
    fn()

    loadMyGroupList()

    const stopListenningSDKMessage = initSDK()
    return stopListenningSDKMessage
  }, [])

  return (
    <SWRConfig value={{}}>
      <AppInitedContext.Provider
        value={{
          inited
        }}
      >
        <AppWrapper>
          <RouterProvider
            router={router}
            fallbackElement={<p>Loading...</p>}
          ></RouterProvider>
        </AppWrapper>
      </AppInitedContext.Provider>
    </SWRConfig>
  )
}

export default App
