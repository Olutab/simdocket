import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tool/',
  build: {
    outDir: 'build',
    emptyOutDir: true,
  }
})