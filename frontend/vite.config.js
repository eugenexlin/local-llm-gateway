import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  define: {
    'import.meta.env.VITE_DEV_TEST_LOGIN': JSON.stringify(process.env.VITE_DEV_TEST_LOGIN || 'false')
  }
})
