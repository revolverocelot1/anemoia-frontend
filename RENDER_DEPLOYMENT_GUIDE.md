# Anemoia Frontend - Render Deployment Guide

This guide provides step-by-step instructions for deploying the Anemoia Frontend application to Render.

## Prerequisites

- A GitHub account with the repository hosted
- A Render account (free tier available at https://render.com)
- Node.js 18+ installed locally for testing

## Pre-Deployment Checklist

1. **Test the build locally:**
   ```bash
   npm install
   npm run build
   npm run preview
   ```

2. **Verify all environment variables** are properly configured in your code (if any)

3. **Check that all large assets** (models, WASM files) are properly included in the repository or hosted externally

## Deployment Steps

### 1. Prepare Your Repository

1. Ensure your code is pushed to GitHub
2. Verify `render.yaml` is in the root directory
3. Confirm all necessary files are committed:
   - `package.json` and `package-lock.json`
   - `vite.config.ts`
   - `index.html`
   - All source files in `/src`
   - All public assets in `/public`

### 2. Connect to Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your repository: `anemoia-frontend-the-one-which-works`

### 3. Configure the Service

Render should automatically detect the `render.yaml` file. If not, configure manually:

- **Name**: `anemoia-frontend`
- **Environment**: `Static Site`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: Set environment variable `NODE_VERSION` to `20`

### 4. Environment Variables (if needed)

Add any required environment variables in the Render dashboard:

```
NODE_VERSION=20
# Add any API keys or configuration here
```

### 5. Deploy

1. Click "Create Web Service"
2. Render will automatically start the first deployment
3. Monitor the build logs for any errors
4. Once deployed, your app will be available at: `https://anemoia-frontend.onrender.com`

## Custom Domain Setup

1. In Render Dashboard, go to your service settings
2. Navigate to "Custom Domains"
3. Add your domain: `anemoias.me`
4. Update your DNS records:
   - Add a CNAME record pointing to your Render URL
   - Or use Render's nameservers for full DNS management

## Post-Deployment

### Verify Functionality

1. **Check all routes** work correctly with client-side routing
2. **Test WebGL features** (image comparison, 3D viewers, etc.)
3. **Verify WASM modules** load correctly
4. **Check fonts and assets** are loading
5. **Test PWA functionality** (manifest, offline capabilities)

### Monitor Performance

1. Use Render's built-in metrics
2. Check browser console for errors
3. Test with Lighthouse for performance scores
4. Monitor CORS issues with external resources

## Troubleshooting

### Build Failures

If the build fails:

1. Check Node version compatibility
2. Verify all dependencies are listed in `package.json`
3. Check for missing environment variables
4. Review build logs for specific errors

### Runtime Issues

**White screen/404 errors:**
- Verify the rewrite rule in `render.yaml` for SPA routing
- Check that `dist/index.html` exists after build

**CORS errors:**
- Add appropriate headers in `render.yaml`
- Check external API configurations

**Large file issues:**
- Consider using CDN for large model files
- Implement lazy loading for heavy assets
- Use service workers for caching

### Performance Optimization

1. **Enable Render's CDN** for static assets
2. **Implement caching headers** (already configured in render.yaml)
3. **Use code splitting** for large bundles
4. **Compress assets** during build process

## Continuous Deployment

Render automatically deploys when you push to your default branch:

1. Make changes locally
2. Test with `npm run build`
3. Commit and push to GitHub
4. Render will automatically deploy

To disable auto-deploy:
1. Go to Settings → Build & Deploy
2. Toggle off "Auto-Deploy"

## Rollback Procedure

If a deployment has issues:

1. Go to the Render dashboard
2. Navigate to "Events" or "Deploys"
3. Find a previous successful deployment
4. Click "Rollback to this deploy"

## Monitoring and Logs

1. **View logs**: Dashboard → Logs
2. **Set up alerts**: Settings → Notifications
3. **Monitor metrics**: Dashboard → Metrics
4. **Health checks**: Configure in render.yaml if needed

## Security Considerations

1. **Never commit sensitive data** (API keys, secrets)
2. **Use environment variables** for configuration
3. **Enable HTTPS** (automatic on Render)
4. **Set security headers** (configured in render.yaml)
5. **Regular dependency updates** for security patches

## Cost Optimization

For free tier limits:
- 750 hours/month of running time
- Automatic sleep after 15 minutes of inactivity
- Limited bandwidth

To optimize:
- Use CDN for large assets
- Enable browser caching
- Minimize build frequency
- Consider upgrading for production use

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: For application-specific problems
- Render Support: support@render.com (for paid plans)

## Maintenance Checklist

Weekly:
- [ ] Check deployment status
- [ ] Review error logs
- [ ] Monitor performance metrics

Monthly:
- [ ] Update dependencies
- [ ] Review security alerts
- [ ] Check SSL certificate status
- [ ] Audit resource usage 