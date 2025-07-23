# Render Deployment Guide for Anemoia

This guide covers deploying both the frontend and backend of Anemoia to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. OAuth app credentials from Google, Twitter, and GitHub
3. The frontend and backend code pushed to GitHub

## Environment Variables

### Frontend Environment Variables

Create these environment variables in your Render web service:

```bash
# Backend API URL (use your backend Render URL)
VITE_API_URL=https://your-backend.onrender.com

# OAuth Redirect URLs (use your frontend domain)
VITE_OAUTH_REDIRECT_BASE=https://anemoias.me

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Twitter OAuth
VITE_TWITTER_CLIENT_ID=your_twitter_client_id_here

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=your_github_client_id_here

# Analytics (optional)
VITE_GA_TRACKING_ID=your_google_analytics_id_here

# Feature Flags
VITE_ENABLE_WHISPER=true
VITE_ENABLE_OAUTH=true
VITE_ENABLE_DEMO_MODE=true
```

### Backend Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///./anemoia.db  # Or use PostgreSQL for production

# JWT Secret (generate a secure random string)
JWT_SECRET=your_secure_jwt_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://anemoias.me/auth/callback/google

# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here
TWITTER_REDIRECT_URI=https://anemoias.me/auth/callback/twitter

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=https://anemoias.me/auth/callback/github

# Email Service (optional, for TestMail.app)
TESTMAIL_API_KEY=your_testmail_api_key
TESTMAIL_NAMESPACE=your_testmail_namespace
```

## Frontend Deployment

1. **Create a New Web Service** on Render
   - Connect your GitHub repository
   - Choose the frontend directory

2. **Build & Deploy Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - **Publish Directory**: `dist`

3. **Advanced Settings**:
   - Add all frontend environment variables
   - Set Node version: `20.x`

4. **Headers Configuration**:
   Add a `_headers` file in your public directory:
   ```
   /*
     Cross-Origin-Embedder-Policy: require-corp
     Cross-Origin-Opener-Policy: same-origin
     Cross-Origin-Resource-Policy: cross-origin
   ```

## Backend Deployment

1. **Create a New Web Service** on Render
   - Connect your GitHub repository
   - Choose the backend directory

2. **Build & Deploy Settings**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Advanced Settings**:
   - Add all backend environment variables
   - Set Python version: `3.11`

4. **Database Setup** (if using PostgreSQL):
   - Create a PostgreSQL database on Render
   - Update `DATABASE_URL` with the connection string

## OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://anemoias.me/auth/callback/google`
   - `http://localhost:5173/auth/callback/google` (for development)

### Twitter OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create a new app
3. Enable OAuth 2.0
4. Add callback URLs:
   - `https://anemoias.me/auth/callback/twitter`
   - `http://localhost:5173/auth/callback/twitter`

### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `https://anemoias.me/auth/callback/github`

## Post-Deployment Steps

1. **Test OAuth Flows**: Try logging in with each provider
2. **Verify Whisper Models**: Test the transcription feature
3. **Check CORS**: Ensure frontend can communicate with backend
4. **Monitor Logs**: Check Render logs for any errors

## Troubleshooting

### CORS Issues
- Ensure backend allows your frontend domain in CORS settings
- Check that all headers are properly set

### OAuth Redirect Issues
- Verify all redirect URIs match exactly in provider settings
- Check that environment variables are correctly set

### Whisper Model Loading
- Models are downloaded client-side and cached in IndexedDB
- Ensure proper CORS headers for model downloads

### WebGPU/WASM Issues
- Verify Cross-Origin headers are set correctly
- Check browser console for specific error messages

## Performance Optimization

1. **Enable Caching**: Configure cache headers for static assets
2. **Use CDN**: Consider using Cloudflare or similar
3. **Optimize Images**: Use WebP format where possible
4. **Lazy Loading**: Already implemented for routes

## Security Checklist

- [ ] Generate secure JWT_SECRET
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set secure OAuth redirect URIs
- [ ] Review CORS settings
- [ ] Enable rate limiting on backend
- [ ] Validate all user inputs

## Monitoring

1. Set up uptime monitoring (e.g., UptimeRobot)
2. Configure error tracking (e.g., Sentry)
3. Monitor resource usage on Render dashboard
4. Set up alerts for failures

## Scaling

Render automatically handles scaling, but consider:
- Upgrading to paid plans for more resources
- Using PostgreSQL instead of SQLite for production
- Implementing caching strategies
- Optimizing database queries 