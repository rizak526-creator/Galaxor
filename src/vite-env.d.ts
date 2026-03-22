/// <reference types="vite/client" />
/// <reference types="@react-three/fiber" />

interface ImportMetaEnv {
  readonly TON_CONNECT_MANIFEST_URL?: string
  readonly VITE_RELEASE_MODE?: string
  readonly VITE_QUALITY_MODE?: string
  readonly VITE_PLANET_ENGINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
