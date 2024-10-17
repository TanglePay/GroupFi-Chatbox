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
import { config } from '../../wallet/src/config'
import Header from 'components/ConnectWallet/connectwallet'
const queryClient = new QueryClient()

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
  <WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
  <Header/>
  <Provider store={store}>
    <MessageDomainIoCProvider>
      <SWRConfig value={{}}>
        <AppWrapper>
          <AppEntryPoint />
        </AppWrapper>
      </SWRConfig>
    </MessageDomainIoCProvider>
  </Provider>
  </QueryClientProvider>
  </WagmiProvider>
)
