'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { WagmiProvider } from 'wagmi'
import { config } from '../../../wallet/src/rainbowkitConfig'
import { Account } from '../../../wallet/src/account'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'

// 动态导入 Chatbox 组件，禁用 SSR
const Chatbox = dynamic(
  () => import('../components/index'),
  { ssr: false }
)

export default function Page() {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        <div className="w-full h-screen">
          <div className="p-4">
            <Account />
          </div>
          <Chatbox 
            theme="light"
            uiConfig={{}}
            isWalletConnected={false}
            isGroupfiNativeMode={false}
          />
        </div>
      </RainbowKitProvider>
    </WagmiProvider>
  )
}