# Render Deployment Guide for Anemoia

This guide ensures successful deployment of both frontend and backend on Render without errors.

## Backend Deployment

### 1. Update Backend Requirements

Ensure your `requirements.txt` in the backend directory contains:

```txt
# Backend Requirements for Anemoia

# Core Framework
fastapi==0.115.5
uvicorn==0.30.6

# Authentication & Security
pyjwt==2.10.1
bcrypt==4.2.0
python-multipart==0.0.9

# Database - CRITICAL for Render
psycopg2-binary==2.9.9
sqlalchemy==2.0.32

# HTTP & OAuth
httpx==0.27.2
requests==2.32.3

# Environment & Config
python-dotenv==1.0.1

# Email and JWT
python-jose[cryptography]==3.3.0

# Additional Dependencies
pydantic==2.9.2
pydantic[email]==2.9.2

# CORS support
fastapi-cors==0.0.6
```

### 2. Backend render.yaml Configuration

Ensure your backend `render.yaml` has proper Python version:

```yaml
services:
  - type: web
    name: anemoia-api
    env: python
    repo: https://github.com/YOUR_USERNAME/anemoia-backend.git
    branch: main
    plan: free
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: anemoia-db
          property: connectionString
      - key: PYTHON_VERSION
        value: "3.11"  # Specify Python version

databases:
  - name: anemoia-db
    plan: free
```

### 3. Backend Environment Variables

Set these in Render dashboard:
- `DATABASE_URL` (auto-linked from database)
- `JWT_SECRET_KEY` (generate a secure key)
- `CORS_ORIGINS` (your frontend URL)

## Frontend Deployment

### 1. Update Frontend Dependencies

Ensure FFmpeg packages are installed:

```bash
npm install @ffmpeg/ffmpeg@0.12.15 @ffmpeg/util@0.12.2 --save
```

### 2. Frontend Build Configuration

Update `vite.config.ts` to exclude FFmpeg from optimization:

```typescript
optimizeDeps: {
  exclude: [
    '@ffmpeg/ffmpeg',
    '@ffmpeg/util',
    '@huggingface/transformers',
    '@xenova/transformers'
  ]
}
```

### 3. Headers Configuration

Ensure `public/_headers` file contains:

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  Access-Control-Allow-Origin: *

/ffmpeg/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  Content-Type: application/javascript
  Cache-Control: public, max-age=31536000, immutable

/*.wasm
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  Content-Type: application/wasm
```

### 4. Frontend render.yaml

```yaml
services:
  - type: web
    name: anemoia-frontend
    runtime: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: NODE_VERSION
        value: 18.17.0
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      # Headers from _headers file will be applied
```

## Pre-Deployment Checklist

### Backend:
- [ ] `psycopg2-binary` is in requirements.txt
- [ ] Python version specified in render.yaml
- [ ] Database service defined in render.yaml
- [ ] Health check endpoint exists (`/api/health`)
- [ ] CORS configured for frontend URL

### Frontend:
- [ ] FFmpeg files in `public/ffmpeg/` directory
- [ ] Headers configured for SharedArrayBuffer
- [ ] Environment variables set for API URL
- [ ] Build tested locally with `npm run build`

## Deployment Steps

1. **Deploy Backend First:**
   ```bash
   git add .
   git commit -m "Add psycopg2-binary for Render deployment"
   git push origin main
   ```

2. **Create Services on Render:**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Create new Web Service for backend
   - Link database to backend service
   - Wait for backend to deploy successfully

3. **Deploy Frontend:**
   - Create new Static Site for frontend
   - Set environment variables (API URL)
   - Deploy

4. **Verify Deployment:**
   - Check backend health: `https://your-backend.onrender.com/api/health`
   - Test frontend transcription feature
   - Monitor logs for any errors

## Troubleshooting

### Backend Issues:
- **psycopg2 error**: Ensure `psycopg2-binary` not `psycopg2`
- **Import errors**: Check Python version compatibility
- **Database connection**: Verify DATABASE_URL is set

### Frontend Issues:
- **FFmpeg not loading**: Check CORS headers and file paths
- **SharedArrayBuffer error**: Verify headers configuration
- **API connection**: Check CORS and API URL configuration

## Post-Deployment

1. Monitor application logs
2. Set up error tracking (e.g., Sentry)
3. Configure custom domain if needed
4. Set up SSL certificates
5. Enable auto-deploy from GitHub 