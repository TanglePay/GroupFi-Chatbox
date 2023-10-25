import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import { MessageDomainIoCProvider } from 'groupfi_trollbox_shared'
import App from './App'

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(<MessageDomainIoCProvider><App /></MessageDomainIoCProvider>)
