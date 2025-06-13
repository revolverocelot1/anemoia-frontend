import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  publicDir: 'public',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      external: [
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-backend-wasm',
        '@tensorflow-models/pose-detection',
        '@mediapipe/pose'
      ],
    },
  },
})
