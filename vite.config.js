import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // All /api/* requests are forwarded to the HAFAS REST API.
      // This avoids CORS restrictions in the browser.
      '/api': {
        target: 'https://v6.db.transport.rest',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.jsx',
    css: false,
  },
})
