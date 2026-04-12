console.log('HELLO FROM VITE CONFIG TOP LEVEL');
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'node:fs';
import { dirname, resolve } from 'node:path';

const demoManagerPlugin = () => {
  console.log('--- DEMO MANAGER PLUGIN INITIALIZED! ---');
  return {
    name: 'demo-manager-plugin',
    enforce: 'pre' as const,
    configureServer(server: any) {
      console.log('--- DEMO MANAGER CONFIGURE SERVER RAN ---');
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.originalUrl || req.url;
        if (url?.includes('admin')) {
          console.log('[DemoManagerPlugin] Received req:', req.method, url);
        }
        // Base directory where we will save demos in Anemoia
        const demosDir = resolve(__dirname, 'public/m4vgs/demos');

        // 1. API to save manifest.json
        if (url && url.startsWith('/api/admin/save-manifest') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: string) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const outPath = resolve(demosDir, 'manifest.json');
              fs.mkdirSync(dirname(outPath), { recursive: true });
              fs.writeFileSync(outPath, body, 'utf8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (e: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }
        
        // 2. API to get the current manifest
        if (url && url.startsWith('/api/admin/get-manifest') && req.method === 'GET') {
          try {
            const outPath = resolve(demosDir, 'manifest.json');
            const content = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '{"demos":[]}';
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(content);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
        
        // 3. API to upload a demo file
        if (url && url.startsWith('/api/admin/upload-demo') && req.method === 'POST') {
          const headerFilename = req.headers['x-filename'];
          const filename = headerFilename ? decodeURIComponent(headerFilename) : null;
          if (!filename) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing x-filename header' }));
          }
          
          try {
            const outPath = resolve(demosDir, filename);
            fs.mkdirSync(dirname(outPath), { recursive: true });
            const writeStream = fs.createWriteStream(outPath);
            req.pipe(writeStream);
            
            req.on('end', () => {
               res.statusCode = 200;
               res.end(JSON.stringify({ success: true, file: `/demos/${filename}` }));
            });
            req.on('error', (err: any) => {
               res.statusCode = 500;
               res.end(JSON.stringify({ error: err.message }));
            });
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
        
        // 4. API to delete a demo file
        if (url && url.startsWith('/api/admin/delete-demo') && req.method === 'POST') {
          const headerFilename = req.headers['x-filename'];
          const filename = headerFilename ? decodeURIComponent(headerFilename) : null;
          if (!filename) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing x-filename header' }));
          }
          
          try {
            let cleanPath = filename;
            if (cleanPath.startsWith('/m4vgs/demos/')) cleanPath = cleanPath.substring(13);
            if (cleanPath.startsWith('/demos/')) cleanPath = cleanPath.substring(7);
            
            const targetPath = resolve(demosDir, cleanPath);
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        next();
      });
    }
  };
};

// Custom plugin to handle ONNX WASM imports
const onnxWasmPlugin = () => {
  return {
    name: 'onnx-wasm-resolver',
    resolveId(id: string) {
      if (id.includes('ort-wasm-simd-threaded.jsep')) {
        const extension = id.split('.').pop()?.split('?')[0];
        return `/ort-wasm/ort-wasm-simd-threaded.jsep.${extension}`;
      }
      return null;
    },
    transform(code: string, id: string) {
      if (code.includes('import(') && code.includes('ort-wasm')) {
        return code.replace(
          /import\s*\(\s*["']([^"']*ort-wasm[^"']*)["']\s*\)/g,
          (match, path) => {
            const filename = path.split('/').pop() || '';
            return `import('/ort-wasm/${filename}')`;
          }
        );
      }
      return code;
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    onnxWasmPlugin(),
    demoManagerPlugin(),
  ],
  base: '/',
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  optimizeDeps: {
    exclude: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      '@huggingface/transformers',
      '@xenova/transformers'
    ],
    include: [
      'onnxruntime-web',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-cpu',
      '@tensorflow/tfjs-backend-webgl', 
      '@tensorflow/tfjs-backend-webgpu',
      '@tensorflow-models/pose-detection',
      '@mediapipe/pose'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
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
      },
    },
    // Configure MIME types for WASM files
    middlewareMode: false,
    hmr: {
      overlay: false
    },
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
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slider'],
          'transformers': ['@huggingface/transformers'],
          'onnx': ['onnxruntime-web'],
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-cpu'],
          'pose': ['@tensorflow-models/pose-detection']
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
    dedupe: ['onnxruntime-web', 'onnxruntime-common'],
    alias: {
      '@': resolve(__dirname, 'src'),
      'three': 'three',
      '@react-three/fiber': '@react-three/fiber',
      '@react-three/drei': '@react-three/drei',
      '@mediapipe/pose': resolve(__dirname, 'node_modules/@mediapipe/pose/pose.js'),
      // Force all ONNX Runtime imports to use the same version
    },
  },
})
