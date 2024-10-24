import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import { MessageDomainIoCProvider } from 'groupfi-sdk-chat'
import AppEntryPoint from './App/index'
import store from './redux/store'
import { Provider } from 'react-redux'
import { SWRConfig } from 'swr'
import { AppWrapper } from 'components/Shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import '@rainbow-me/rainbowkit/styles.css';
import { config } from '../../wallet/src/rainbowkitConfig'

import {
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { Account } from '../../wallet/src/account'


const queryClient = new QueryClient()
const MessageProvider = MessageDomainIoCProvider as React.FC<{ children: React.ReactNode }>

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <MessageProvider>
            <SWRConfig value={{}}>
                <RainbowKitProvider locale='en-US'>
                  <Account />
                </RainbowKitProvider>
              <AppWrapper>
                <AppEntryPoint />
              </AppWrapper>
            </SWRConfig>
          </MessageProvider>
        </Provider>
    </QueryClientProvider>
  </WagmiProvider>
)
