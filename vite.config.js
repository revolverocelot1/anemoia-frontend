import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// Custom plugin to handle ONNX WASM imports
const onnxWasmPlugin = () => {
    return {
        name: 'onnx-wasm-resolver',
        resolveId(id) {
            // Handle ONNX WASM module imports
            if (id.includes('ort-wasm-simd-threaded.jsep')) {
                const extension = id.split('.').pop()?.split('?')[0];
                return `/ort-wasm/ort-wasm-simd-threaded.jsep.${extension}`;
            }
            return null;
        },
        transform(code, id) {
            // Transform dynamic imports for ONNX modules
            if (code.includes('import(') && code.includes('ort-wasm')) {
                return code.replace(/import\s*\(\s*["']([^"']*ort-wasm[^"']*)["']\s*\)/g, (match, path) => {
                    const filename = path.split('/').pop() || '';
                    return `import('/ort-wasm/${filename}')`;
                });
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
        alias: {
            '@': resolve(__dirname, 'src'),
            'three': 'three',
            '@react-three/fiber': '@react-three/fiber',
            '@react-three/drei': '@react-three/drei',
            '@mediapipe/pose': resolve(__dirname, 'node_modules/@mediapipe/pose/pose.js'),
            // Force all ONNX Runtime imports to use the same version
            'onnxruntime-web': resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.min.js'),
            'onnxruntime-web/webgpu': resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.webgpu.min.js')
        },
    },
});
