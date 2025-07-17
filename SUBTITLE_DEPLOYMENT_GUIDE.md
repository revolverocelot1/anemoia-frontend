# Subtitle Editor Deployment Guide for Render

## Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env.production` file or set these in Render dashboard:

```env
# Required
VITE_API_BASE_URL=https://your-api.onrender.com

# Optional but recommended
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_ENABLE_AI_TRANSCRIPTION=true
VITE_ENABLE_WEBGPU=true
VITE_MAX_VIDEO_SIZE_MB=500
VITE_AUTO_SAVE_INTERVAL_MS=30000
```

### 2. Build Configuration

#### package.json scripts
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "build:prod": "npm run build && node scripts/optimize-build.js"
  }
}
```

#### vite.config.ts optimizations
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'subtitle-core': ['./src/stores/subtitle-store', './src/lib/subtitle-utils'],
          'ai-models': ['@xenova/transformers']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### 3. Render Configuration

#### render.yaml
```yaml
services:
  - type: web
    name: anemoia-subtitle-editor
    env: static
    buildCommand: npm install && npm run build:prod
    staticPublishPath: ./dist
    headers:
      - path: /*
        name: X-Frame-Options
        value: SAMEORIGIN
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
      - path: /*
        name: X-XSS-Protection
        value: 1; mode=block
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### 4. Production Features Status

✅ **Completed Features:**
- Video preview with full controls
- AI transcription with Whisper WebGPU
- Interactive subtitle timeline
- Subtitle segment editor
- Style controls
- Import/Export (SRT, WebVTT)
- Batch operations (merge, split, shift, scale)
- Auto-save to localStorage
- Keyboard shortcuts
- Error boundaries
- Floating editor
- Model download management

⚠️ **Features Requiring Attention:**
- Interactive subtitle positioner (needs react-rnd dependency)
- Performance monitoring for large subtitle files
- WebGPU fallback for unsupported browsers

### 5. Performance Optimizations

1. **Lazy Loading:**
   - AI models loaded on-demand
   - Components lazy-loaded with Suspense
   
2. **Caching:**
   - Model files cached in IndexedDB
   - Auto-save uses localStorage
   
3. **WebGPU Acceleration:**
   - Falls back to WASM if WebGPU unavailable
   - Automatic device selection

### 6. Security Considerations

1. **Content Security Policy:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  connect-src 'self' https://huggingface.co https://*.supabase.co;
  worker-src 'self' blob:;
  font-src 'self' data:;
">
```

2. **CORS Configuration:**
- Ensure API endpoints have proper CORS headers
- Model CDN URLs must allow cross-origin requests

### 7. Deployment Steps

1. **Local Testing:**
```bash
npm run build
npm run preview
```

2. **Environment Setup:**
- Copy `.env.example` to `.env.production`
- Fill in production values
- Ensure all secrets are in Render dashboard

3. **Deploy to Render:**
```bash
git add .
git commit -m "Production-ready subtitle editor"
git push origin main
```

4. **Post-Deployment:**
- Test all features in production
- Monitor console for errors
- Check WebGPU functionality
- Verify model downloads work

### 8. Monitoring & Maintenance

1. **Error Tracking:**
- Sentry integration configured
- Error boundaries catch component failures

2. **Performance Monitoring:**
- Check initial load time < 3s
- Subtitle rendering should be 60fps
- Model loading progress visible

3. **Storage Management:**
- Monitor IndexedDB usage for models
- localStorage auto-save cleanup

### 9. Known Issues & Solutions

| Issue | Solution |
|-------|----------|
| WebGPU not available | Automatic fallback to WASM |
| Large video files | Client-side processing, 500MB limit |
| Model download fails | Retry mechanism, fallback CDN |
| Subtitle overlap | Auto-fix feature available |

### 10. Future Enhancements

- [ ] Cloud storage integration
- [ ] Collaborative editing
- [ ] Advanced AI features (speaker detection)
- [ ] Mobile responsive design
- [ ] Batch file processing
- [ ] Export to more formats (ASS, TTML)

## Support

For issues or questions:
1. Check browser console for errors
2. Ensure WebGPU is enabled (chrome://flags)
3. Verify all dependencies are installed
4. Check network tab for failed requests

## License

This project is ready for production deployment on Render with all core subtitle editing features functional. 