import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// eslint-disable-next-line no-undef
const processEnv = typeof process !== 'undefined' ? process.env : {};

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    strictPort: true,
    proxy: {
      '/api/api-keys': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/metrics': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  define: {
    'import.meta.env.VITE_DEV_TEST_LOGIN': JSON.stringify(processEnv.VITE_DEV_TEST_LOGIN || 'false')
  }
})
