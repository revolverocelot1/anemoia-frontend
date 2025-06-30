import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { Connect } from 'vite'

// This is required for Vite to correctly handle the ONNX runtime web worker
const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) => {
      if (req.url?.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasmContentTypePlugin],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  publicDir: 'public',
  build: {
    assetsInlineLimit: 0,
    target: 'esnext',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@tensorflow/tfjs-backend-wasm'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
