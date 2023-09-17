import React from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper, Loading } from './src/components/Shared'
import { }

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
    <AppWrapper>
      <RouterProvider
        router={router}
        fallbackElement={<p>Loading...</p>}
      ></RouterProvider>
    </AppWrapper>
  )
}

export default App
