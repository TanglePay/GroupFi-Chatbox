import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper, Loading } from 'components/Shared'
import { MessageDomainIoCProvider } from 'groupfi_trollbox_shared'

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
  return (
    <MessageDomainIoCProvider>
      <AppWrapper>
        <RouterProvider
          router={router}
          fallbackElement={<p>Loading...</p>}
        ></RouterProvider>
      </AppWrapper>
    </MessageDomainIoCProvider>
  )
}

export default App
