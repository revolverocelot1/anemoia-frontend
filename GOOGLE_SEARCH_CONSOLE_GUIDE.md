# Google Search Console Sitemap Submission Guide

## Step 1: Access Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account

## Step 2: Add Your Property
1. Click "Add property"
2. Choose "Domain" and enter: `anemoias.me`
3. Or choose "URL prefix" and enter: `https://anemoias.me`

## Step 3: Verify Ownership
Choose one of these methods:

### Method 1: HTML File Upload (Recommended)
1. Download the HTML verification file from Google
2. Upload it to your public folder
3. Deploy to Render
4. Click "Verify" in Search Console

### Method 2: DNS TXT Record
1. Go to your domain registrar (where you bought anemoias.me)
2. Add the TXT record Google provides
3. Wait 5-10 minutes for DNS propagation
4. Click "Verify"

### Method 3: HTML Meta Tag
1. Copy the meta tag from Google
2. Add it to your index.html <head> section
3. Deploy and verify

## Step 4: Submit Your Sitemap
1. After verification, go to "Sitemaps" in the left menu
2. Enter: `sitemap.xml` in the "Add a new sitemap" field
3. Click "Submit"
4. Google will process it (may take a few hours to days)

## Step 5: Request Indexing for Important Pages
1. Go to "URL Inspection" tool
2. Enter each important URL:
   - `https://anemoias.me`
   - `https://anemoias.me/compare/landing`
   - `https://anemoias.me/depth-map/landing`
   - `https://anemoias.me/upscaler/landing`
3. Click "Request Indexing" for each

## Step 6: Monitor Performance
1. Check "Performance" tab after a few days
2. View "Coverage" for indexing issues
3. Check "Core Web Vitals" for performance

## Additional Tips
- Submit sitemap after each major update
- Fix any errors shown in Coverage report
- Use URL Inspection to debug specific pages
- Check Mobile Usability report 