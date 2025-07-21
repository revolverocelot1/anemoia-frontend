# Google Search Console Indexing Guide for anemoias.me

## 1. Set Up Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Add your property: `https://anemoias.me`
3. Verify ownership using one of these methods:
   - HTML file upload (recommended)
   - HTML tag
   - Domain name provider
   - Google Analytics
   - Google Tag Manager

## 2. Submit Your Sitemap

1. In Search Console, go to "Sitemaps" in the left menu
2. Enter: `https://anemoias.me/sitemap.xml`
3. Click "Submit"
4. Google will automatically crawl and index all URLs in your sitemap

## 3. Request Indexing for Important Pages

For faster indexing of critical pages:

1. Go to "URL Inspection" tool
2. Enter each important URL:
   - `https://anemoias.me/`
   - `https://anemoias.me/compare/landing`
   - `https://anemoias.me/depth-map/landing`
   - `https://anemoias.me/upscaler/landing`
   - `https://anemoias.me/pose-estimation/landing`
   - `https://anemoias.me/splat-viewer/landing`
   - `https://anemoias.me/ascii-video-converter`
3. Click "Request Indexing" for each

## 4. Improve Indexing with robots.txt

Create or update `/public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://anemoias.me/sitemap.xml

# Allow all crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Disallow auth callback pages
Disallow: /auth/callback
Disallow: /test
```

## 5. Add Structured Data (Optional but Recommended)

Add JSON-LD structured data to your tool pages for better search appearance:

```javascript
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Anemoia AI Tools",
  "url": "https://anemoias.me",
  "description": "Free AI-powered image and video processing tools",
  "applicationCategory": "Multimedia",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

## 6. Monitor Indexing Progress

1. Check "Coverage" report in Search Console
2. Monitor "Performance" to see which pages appear in search
3. Use "Core Web Vitals" to ensure good page experience

## 7. Best Practices for Better Indexing

1. **Internal Linking**: Link between your tools and landing pages
2. **Fresh Content**: Update landing pages regularly
3. **Page Speed**: Optimize images and code for fast loading
4. **Mobile-Friendly**: Ensure all pages work well on mobile
5. **Meta Tags**: Each page should have unique title and description tags

## 8. Common Issues and Solutions

- **Pages not indexed**: Check robots.txt, ensure pages are in sitemap
- **Slow indexing**: Request manual indexing, improve page quality
- **Duplicate content**: Use canonical tags to specify preferred URLs
- **404 errors**: Fix broken links or redirect them

## Timeline

- Sitemap submission: Indexed within 1-3 days
- Manual indexing requests: Usually within hours
- Full site indexing: 1-4 weeks depending on site size

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters/)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [PageSpeed Insights](https://pagespeed.web.dev/) - Check your site speed 