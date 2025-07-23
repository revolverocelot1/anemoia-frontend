# SEO Fix Guide for Anemoia

## Issues Fixed

1. **Logo not appearing in search results**: 
   - Added absolute URL for Open Graph image (`https://anemoias.me/A_logo.png`)
   - Created web app manifest with proper icon definitions
   - Added structured metadata for social media previews

2. **Description not showing**:
   - Enhanced meta description tag
   - Added Open Graph descriptions
   - Created sitemap.xml for better indexing

3. **GitHub links and personal information**:
   - Removed all GitHub repository links from README.md
   - Removed author information that could link to personal GitHub
   - Created generic support links

## Files Created/Modified

### Created:
- `public/robots.txt` - Controls search engine crawling
- `public/manifest.json` - Web app manifest for better metadata
- `public/sitemap.xml` - Helps search engines index your site
- `public/social-preview.html` - Template for generating social media preview image

### Modified:
- `index.html` - Enhanced meta tags, added absolute URLs for images
- `README.md` - Removed GitHub links and personal information

## Next Steps

1. **Deploy Changes**: Push these changes to your production server

2. **Google Search Console**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add and verify your domain (anemoias.me)
   - Submit your sitemap: `https://anemoias.me/sitemap.xml`
   - Request re-indexing of your homepage

3. **Generate Social Preview Image** (Optional):
   - Open `https://anemoias.me/social-preview.html` in browser
   - Take a screenshot (1200x630px)
   - Save as `public/social-preview.png`
   - Update index.html to use this image instead of logo

4. **Test Your SEO**:
   - Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - Use [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

5. **Additional Improvements**:
   - Consider adding a larger preview image (1200x630px) specifically for social media
   - Add JSON-LD structured data for better rich snippets
   - Ensure all images have proper alt text

## Verifying Changes

After deployment, test your site:

1. **Check Meta Tags**: View page source and verify all meta tags are present
2. **Test Sharing**: Share your link on social media platforms to see preview
3. **Google Search**: After re-indexing (may take days), search for "anemoias.me"

## Important Notes

- Search engines may take several days to update their index
- The logo might be too small for optimal social media previews (recommend 1200x630px image)
- Make sure your hosting service serves the robots.txt and sitemap.xml files correctly
- If using Cloudflare or similar CDN, clear the cache after deploying

## Privacy Protection

All personal information and GitHub links have been removed. The site now only references:
- Domain: anemoias.me
- Generic email: support@anemoia.dev
- Company name: Anemoia (no personal names) 