import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: [
      'onnxruntime-web',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      '@huggingface/transformers',
      '@tensorflow/tfjs-backend-webgpu',
      '@tensorflow/tfjs-backend-webgl',
      '@mediapipe/tasks-vision'
    ],
    include: [
      '@tensorflow-models/pose-detection',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-cpu'
    ]
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    fs: {
      allow: ['..']
    },
    cors: true,
    // Add proxy for Hugging Face to avoid CORS issues
    proxy: {
      '/hf-proxy': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    },
    // Configure MIME types for WASM files
    middlewareMode: false,
    hmr: {
      overlay: false
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      external: (id) => {
        // Treat optional dependencies as external to avoid resolution issues
        if (id.includes('@mediapipe/pose') || 
            id.includes('@tensorflow/tfjs-backend-webgpu') ||
            id.includes('@tensorflow/tfjs-backend-webgl') ||
            id.includes('@mediapipe/tasks-vision')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slider'],
          'transformers': ['@huggingface/transformers'],
          'onnx': ['onnxruntime-web'],
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-cpu'],
          'pose': ['@tensorflow-models/pose-detection']
        },
        globals: {
          '@mediapipe/pose': 'mediapipe',
          '@tensorflow/tfjs-backend-webgpu': 'tf',
          '@tensorflow/tfjs-backend-webgl': 'tf',
          '@mediapipe/tasks-vision': 'mediapipe'
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      ignoreDynamicRequires: true
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'three': 'three',
      '@react-three/fiber': '@react-three/fiber',
      '@react-three/drei': '@react-three/drei',
      '@mediapipe/pose': resolve(__dirname, 'node_modules/@mediapipe/pose/pose.js')
    },
  },
})
