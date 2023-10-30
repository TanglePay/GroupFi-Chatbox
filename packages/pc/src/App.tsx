import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper, Loading } from 'components/Shared'
import { useEffect } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor } from 'utils'

import './App.scss'

const routes = [
  {
    path: '/',
    url: './components/GroupList'
  },
  {
    path: '/group/:id',
    url: './components/ChatRoom'
  },
  {
    path: '/group/:id/info',
    url: './components/GroupInfo'
  }
]

/* @vite-ignore */
const router = createBrowserRouter(
  routes.map(({ path, url }) => {
    return {
      path,
      async lazy() {
        const Component = (await import(url)).default
        return { Component }
      }
    }
  })
)

function App() {
  const { messageDomain } = useMessageDomain()
  const fn = async () => {
    await messageDomain.connectWallet()
    await messageDomain.setupGroupFiMqttConnection(connect)
    await messageDomain.getGroupFiService().setupIotaMqttConnection(MqttClient)
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
