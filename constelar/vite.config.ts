import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // encaminha o WebSocket da sala para o servidor de tempo real
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
        changeOrigin: true,
      },
      // encaminha a API REST para o servidor Constelar
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
