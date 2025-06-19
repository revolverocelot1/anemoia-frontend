import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
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
    },
    optimizeDeps: {
        exclude: ['@tensorflow/tfjs-backend-wasm'],
    },
});
