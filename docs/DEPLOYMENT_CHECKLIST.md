# Deployment Checklist for Render

## Pre-deployment Checks

### 1. Environment Variables
- [ ] All environment variables are set in Render dashboard
- [ ] Supabase keys are configured
- [ ] API endpoints use production URLs

### 2. Build Configuration
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors
- [ ] All dependencies are in `package.json` (not devDependencies if needed in production)

### 3. Background & Performance
- [ ] 3D background defaults to OFF in production (implemented ✓)
- [ ] Error boundaries catch WebGL failures (implemented ✓)
- [ ] Fallback gradient background always present (implemented ✓)

### 4. Security & CORS
- [ ] External iframes have fallback options (implemented ✓)
- [ ] CSP headers allow necessary resources
- [ ] HTTPS enforced for all resources

### 5. Assets & Fonts
- [ ] Material Symbols font loads from Google Fonts CDN
- [ ] All images use relative paths
- [ ] Favicon and app icons are present

### 6. Testing Commands
```bash
# Test production build locally
npm run build
npm run preview

# Check for build errors
npm run type-check
```

## Render-specific Settings

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm run preview
```

### Environment
- Node version: 18.x or higher
- Auto-deploy: Enabled for main branch

## Post-deployment Verification

1. Check console for errors
2. Test Ctrl+B to toggle 3D background
3. Verify all tool cards are visible
4. Test Doom page (expect fallback to Archive.org link)
5. Check responsive design on mobile

## Troubleshooting

### If 3D background causes issues:
- Users can press Ctrl+B to disable
- Automatically disabled in production by default
- Error handler disables it on WebGL failures

### If icons don't appear:
- Check Material Symbols font is loading
- Verify icon CSS classes are applied
- Check browser console for font loading errors

### If Doom doesn't load:
- Expected behavior due to iframe restrictions
- Archive.org link provided as alternative
- Consider self-hosting in future 