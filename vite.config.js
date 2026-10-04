import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      // TerraNova sign-in handoff (POST /sso/terranova) is served by the API too.
      '/sso': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      '/api-proxy': {
        target: 'https://api.drboahemaantim.com/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
})
