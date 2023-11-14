import {
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import { AppWrapper, Loading } from 'components/Shared'
import { useEffect, createContext, useState } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor } from 'utils'

import './App.scss'
import { useGroupFiService } from 'hooks'

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
  const groupFiService = useGroupFiService()

  const [inited, setInited] = useState(false)

  const onAccountChanged = (newAddress: string) => {
    router.navigate('/')
  }

  const fn = async () => {
    await messageDomain.connectWallet()
    await messageDomain.setupGroupFiMqttConnection(connect)
    messageDomain.listenningAccountChanged(onAccountChanged)
    const adapter = new LocalStorageAdaptor()
    messageDomain.setStorageAdaptor(adapter)
    setInited(true)

    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
  }

  useEffect(() => {
    fn()
  }, [])
  
  useEffect(() => {
    if(groupFiService !== null) {
      groupFiService.setupIotaMqttConnection(MqttClient)
    }
  }, [groupFiService])

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
