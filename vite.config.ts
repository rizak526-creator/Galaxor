import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TON_CONNECT_'],
  server: {
    host: true,
    port: 5173,
  },
})
