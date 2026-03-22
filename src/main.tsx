import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.tsx'

// Если переменная окружения не задана, берём manifest с текущего домена.
const manifestUrl =
  import.meta.env.TON_CONNECT_MANIFEST_URL?.trim() ||
  `${window.location.origin}/tonconnect-manifest.json`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Провайдер нужен для TonConnectButton и хуков кошелька. */}
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      language="ru"
      restoreConnection={false}
      analytics={{ mode: 'off' }}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
