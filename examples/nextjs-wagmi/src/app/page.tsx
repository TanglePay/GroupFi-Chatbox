
'use client'
import { Buffer } from 'buffer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
// import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
// import App from './App'
import { config } from './wagmi'
import dynamic from 'next/dynamic'

// import './index.css'

globalThis.Buffer = Buffer

const queryClient = new QueryClient()
const App = dynamic(() => import('./App'), { ssr: false })


export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
)
}