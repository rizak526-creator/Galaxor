/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TON_CONNECT_MANIFEST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
