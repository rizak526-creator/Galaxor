import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.tsx'

const manifestUrl =
  import.meta.env.TON_CONNECT_MANIFEST_URL ??
  'https://galaxor.ru/tonconnect-manifest.json'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Провайдер нужен для TonConnectButton и хуков кошелька. */}
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
