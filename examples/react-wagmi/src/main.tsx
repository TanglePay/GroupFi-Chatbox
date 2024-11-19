import { Buffer } from 'buffer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import App from './App.tsx'
import { config } from './wagmi.ts'

// import './index.css'

globalThis.Buffer = Buffer

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)

// import { Buffer } from 'buffer'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import React from 'react'
// import ReactDOM from 'react-dom/client'
// // import { WagmiProvider } from 'wagmi'
// import {PrivyProvider} from '@privy-io/react-auth';
// // Make sure to import `WagmiProvider` from `@privy-io/wagmi`, not `wagmi`
// import {WagmiProvider} from '@privy-io/wagmi';

// import App from './App.tsx'
// // import { config } from './wagmi.ts'
// import {privyConfig} from './privyConfig';
// import {wagmiConfig} from './wagmiConfig';


// globalThis.Buffer = Buffer
// // main.tsx
// const privyAppId = process.env.PRIVY_APP_ID;


// const queryClient = new QueryClient()

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <PrivyProvider appId= {privyAppId} config={privyConfig}>
//       <QueryClientProvider client={queryClient}>
//         <WagmiProvider config={wagmiConfig}>
//           <App />
//         </WagmiProvider>
//       </QueryClientProvider>
//     </PrivyProvider>



//     {/* <WagmiProvider config={config}>
//       <QueryClientProvider client={queryClient}>
//         <App />
//       </QueryClientProvider>
//     </WagmiProvider> */}
//   </React.StrictMode>,
// )
