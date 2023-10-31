import {
  RouterProvider,
  createBrowserRouter,
  BrowserRouter
} from 'react-router-dom'
import { AppWrapper, Loading } from 'components/Shared'
import { useEffect } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor } from 'utils'

import './App.scss'
import { useGroupFiService } from 'hooks'

const routes = [
  {
    path: '/',
    url: './components/GroupList'
  },
  {
    path: 'group/:id',
    url: './components/ChatRoom'
  },
  {
    path: 'group/:id/info',
    url: './components/GroupInfo'
  },
  {
    path: 'user/:id',
    url: './components/UserInfo'
  }
]

// const router = createBrowserRouter(
//   routes.map(({ path, url }) => {
//     return {
//       path,
//       async lazy() {
//         const Component = (await import(url)).default
//         return { Component }
//       }
//     }
//   })
// )

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

function App() {
  const { messageDomain } = useMessageDomain()
  const groupFiService = useGroupFiService()
  const fn = async () => {
    await messageDomain.connectWallet()
    await messageDomain.setupGroupFiMqttConnection(connect)
    await groupFiService.setupIotaMqttConnection(MqttClient)
    const adapter = new LocalStorageAdaptor()
    messageDomain.setStorageAdaptor(adapter)
    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
  }
  useEffect(() => {
    fn()
  }, [])
  return (
    <AppWrapper>
      <RouterProvider
        router={router}
        fallbackElement={<p>Loading...</p>}
      ></RouterProvider>
    </AppWrapper>
  )
}

export default App
