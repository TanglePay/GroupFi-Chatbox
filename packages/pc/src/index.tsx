import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import { MessageDomainIoCProvider } from 'groupfi_trollbox_shared'
import AppEntryPoint from './App/index'
import store from './redux/store'
import { Provider } from 'react-redux'
import { SWRConfig } from 'swr'
import { AppWrapper } from 'components/Shared'

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
  <Provider store={store}>
    <MessageDomainIoCProvider>
      <SWRConfig value={{}}>
        <AppWrapper>
          <AppEntryPoint />
        </AppWrapper>
      </SWRConfig>
    </MessageDomainIoCProvider>
  </Provider>
)
