import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import { MessageDomainIoCProvider } from 'groupfi_trollbox_shared'
import App from './App'
import store from './redux/store'
import { Provider } from 'react-redux'

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
  <Provider store={store}>
    <MessageDomainIoCProvider>
      <App />
    </MessageDomainIoCProvider>
  </Provider>
)
