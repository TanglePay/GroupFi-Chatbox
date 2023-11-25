import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper } from 'components/Shared'
import { useEffect, createContext, useState } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor } from 'utils'

import { useAppDispatch } from './redux/hooks'
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

  const onAccountChanged = (newAddress: string) => {
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

  const initSDK = () => {
    const sdkHandler = new SDKHandler(messageDomain)
    const sdkReceiver = new SDKReceiver(sdkHandler)
    return sdkReceiver.listenningMessage()
  }

  const initGroupList = async () => {
    const forMeGroups = await messageDomain
      .getGroupFiService()
      .getRecommendGroups()
      appDispatch(setForMeGroups(forMeGroups))

    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    console.log('===>myGroups', myGroups)
    appDispatch(setMyGroups(myGroups))
  }

  useEffect(() => {
    if (inited) {
      initGroupList()
    }
  }, [inited])

  useEffect(() => {
    fn()

    const stopListenningSDKMessage = initSDK()
    return stopListenningSDKMessage
  }, [])

  return (
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
  )
}

export default App
