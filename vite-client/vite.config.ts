import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        splExample: 'src/spl-example/index.html'
      }
    }
  }
})
