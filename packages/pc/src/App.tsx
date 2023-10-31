import { RouterProvider, createBrowserRouter } from 'react-router-dom'
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
    path: '/group/:id',
    url: './components/ChatRoom'
  },
  {
    path: '/group/:id/info',
    url: './components/GroupInfo'
  },
  {
    path: '/user/:id',
    url: './components/UserInfo'
  }
]

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
  const groupFiService = useGroupFiService()
  const fn = async () => {
    await messageDomain.connectWallet()
    const mqttWrapper = window as unknown as { mqtt: any }
    await messageDomain.setupGroupFiMqttConnection(mqttWrapper.mqtt.connect)
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
