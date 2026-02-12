import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
      port: 40000,
      host: "0.0.0.0",
      allowedHosts: true,
    proxy: {
      '/v1': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/images': 'http://localhost:3000',
    }
  }
})
