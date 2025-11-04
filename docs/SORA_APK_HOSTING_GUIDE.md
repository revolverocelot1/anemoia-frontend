# Sora APK Hosting Guide

This guide explains how to host the Sora APK file anonymously with fast download speeds without straining your Render server.

## 🎯 Recommended Hosting Solutions

### Option 1: GitHub Releases (Recommended) ⭐

**Pros:**
- Fast CDN delivery worldwide
- Free unlimited bandwidth
- Anonymous (use burner account)
- No file size limits for releases
- Persistent URLs

**Setup:**
1. Create a new GitHub account (use disposable email)
2. Create a new repository (can be private or public)
3. Go to "Releases" → "Create a new release"
4. Upload your APK file as a release asset
5. Publish the release
6. Copy the direct download URL from the asset

**Direct URL Format:**
```
https://github.com/USERNAME/REPO/releases/download/TAG/Sora-1.2025.307.apk
```

**Update your HTML:**
```javascript
const apkUrl = 'https://github.com/USERNAME/REPO/releases/download/v1.2025.307/Sora-1.2025.307.apk';
```

---

### Option 2: Cloudflare R2 (Free Tier)

**Pros:**
- 10GB free storage
- Zero egress fees
- Fast global CDN
- Can configure custom domain
- Anonymous with burner account

**Setup:**
1. Sign up for Cloudflare account
2. Navigate to R2 Storage
3. Create a bucket
4. Upload your APK
5. Make the bucket public
6. Get the public URL

**Approximate URL:**
```
https://pub-XXXXXX.r2.dev/Sora-1.2025.307.apk
```

---

### Option 3: IPFS (Decentralized & Anonymous)

**Pros:**
- Completely decentralized
- Anonymous by design
- Free
- Permanent if pinned
- Multiple gateway options

**Setup:**
1. Install IPFS Desktop or use web service like [Pinata](https://pinata.cloud)
2. Upload your APK file
3. Get the IPFS hash (CID)
4. Use a public gateway for download

**URL Format:**
```
https://ipfs.io/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXX
```

Or use faster gateways:
```
https://cloudflare-ipfs.com/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXX
https://gateway.pinata.cloud/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### Option 4: File.io (Anonymous File Sharing)

**Pros:**
- Completely anonymous
- No registration required
- Simple API
- Good for temporary sharing

**Cons:**
- Files expire after first download (can set custom expiry)
- Not suitable for permanent hosting

**Setup:**
```bash
curl -F "file=@Sora-1.2025.307.apk" https://file.io
```

Returns:
```json
{
  "success": true,
  "key": "XXXXXX",
  "link": "https://file.io/XXXXXX",
  "expiry": "14 days"
}
```

---

### Option 5: Catbox.moe (Anonymous File Host)

**Pros:**
- No registration required
- Free
- 200MB file size limit
- Files stay for 1 year if not accessed

**Upload via cURL:**
```bash
curl -F "reqtype=fileupload" -F "fileToUpload=@Sora-1.2025.307.apk" https://catbox.moe/user/api.php
```

**URL Format:**
```
https://files.catbox.moe/XXXXXX.apk
```

---

### Option 6: Bunny CDN Storage

**Pros:**
- Extremely fast global CDN
- $0.01/GB storage + $0.01/GB bandwidth
- Very cheap for small files
- Anonymous with crypto payment

**Setup:**
1. Sign up at bunny.net
2. Create storage zone
3. Upload via FTP or API
4. Get pull zone URL

---

## 🚀 Optimal Solution (My Recommendation)

**Use GitHub Releases + CDN Fallback**

1. **Primary:** GitHub Releases (free, fast, reliable)
2. **Fallback:** IPFS via Pinata (decentralized backup)
3. **Emergency:** Catbox.moe (anonymous, no account needed)

---

## 📝 Implementation Steps

### Step 1: Upload to GitHub Releases

```bash
# Create a new repo (or use existing)
gh repo create sora-apk-dist --public

# Create a release
gh release create v1.2025.307 \
  --title "Sora 1.2025.307" \
  --notes "Latest version of Sora APK" \
  ./Sora-1.2025.307.apk
```

### Step 2: Get Direct Download URL

The URL will be:
```
https://github.com/YOUR-USERNAME/sora-apk-dist/releases/download/v1.2025.307/Sora-1.2025.307.apk
```

### Step 3: Update Your HTML File

Open `public/sora-apk.html` and find this line:
```javascript
const apkUrl = 'YOUR_APK_DOWNLOAD_URL_HERE';
```

Replace with:
```javascript
const apkUrl = 'https://github.com/YOUR-USERNAME/sora-apk-dist/releases/download/v1.2025.307/Sora-1.2025.307.apk';
```

### Step 4: Enable Actual Download

Replace the demo code with:
```javascript
document.getElementById('downloadBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    const apkUrl = 'YOUR_ACTUAL_URL_HERE';
    
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="download-icon">⏳</span> Starting Download...';
    btn.style.pointerEvents = 'none';
    
    // Trigger download
    setTimeout(() => {
        // Create download link
        const link = document.createElement('a');
        link.href = apkUrl;
        link.download = 'Sora-1.2025.307.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        btn.innerHTML = '<span class="download-icon">✅</span> Download Started!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }, 3000);
    }, 500);
});
```

---

## 🔒 Security & Anonymity Tips

1. **Use a burner email** for any account creation
2. **Use Tor browser** when uploading (optional but recommended)
3. **Don't use your main GitHub account** - create a new one
4. **Consider using a VPN** during upload
5. **Use cryptocurrency** for paid services if you want complete anonymity

---

## 📊 Performance Comparison

| Service | Speed | Anonymity | Cost | Reliability |
|---------|-------|-----------|------|-------------|
| GitHub Releases | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Free | ⭐⭐⭐⭐⭐ |
| Cloudflare R2 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free | ⭐⭐⭐⭐⭐ |
| IPFS | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free | ⭐⭐⭐⭐ |
| File.io | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free | ⭐⭐⭐ |
| Catbox.moe | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free | ⭐⭐⭐⭐ |
| Bunny CDN | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Paid | ⭐⭐⭐⭐⭐ |

---

## 🎬 Quick Start (Fastest Method)

If you just want to get it done FAST:

```bash
# 1. Upload to GitHub Release (easiest)
# Create repo and upload via GitHub UI

# 2. Or use Catbox.moe (no account needed)
curl -F "reqtype=fileupload" -F "fileToUpload=@Sora-1.2025.307.apk" \
  https://catbox.moe/user/api.php

# 3. Copy the returned URL and paste it in your HTML
```

---

## 🌐 CDN Distribution Tips

For maximum speed worldwide:

1. **Use multiple mirrors** - Have 2-3 backup URLs
2. **Implement smart routing** - Check user's location and serve from nearest
3. **Add retry logic** - If one download fails, try backup URL
4. **Monitor bandwidth** - Set up alerts for quota usage

Example multi-mirror implementation:
```javascript
const mirrors = [
    'https://github.com/user/repo/releases/download/v1/Sora.apk',
    'https://files.catbox.moe/xxxxx.apk',
    'https://ipfs.io/ipfs/QmXXXXX'
];

async function downloadAPK() {
    for (const mirror of mirrors) {
        try {
            window.location.href = mirror;
            break;
        } catch (error) {
            continue; // Try next mirror
        }
    }
}
```

---

## 📌 Important Notes

- **File Size:** Ensure your APK is optimized (should be under 100MB)
- **Naming:** Use descriptive names like `Sora-1.2025.307.apk`
- **Checksums:** Provide SHA-256 hash for users to verify integrity
- **Updates:** Update URLs when releasing new versions
- **Monitoring:** Regularly check if links are still active

---

## ✅ Final Checklist

- [ ] APK file prepared and tested
- [ ] Hosting service selected
- [ ] File uploaded successfully
- [ ] Direct download URL obtained
- [ ] HTML file updated with actual URL
- [ ] Download functionality tested
- [ ] Backup mirror set up (optional)
- [ ] Documentation updated

---

## 🆘 Troubleshooting

**Problem:** GitHub rate limiting
- **Solution:** Use CDN like jsDelivr to cache GitHub releases

**Problem:** IPFS too slow
- **Solution:** Use multiple gateway URLs, let browser pick fastest

**Problem:** File gets taken down
- **Solution:** Have 2-3 backup mirrors ready

**Problem:** Render getting strained
- **Solution:** NEVER host APK directly on Render - always use external CDN

---

## 📞 Need Help?

If you encounter any issues:
1. Check if the URL is accessible in incognito mode
2. Verify file size matches expected
3. Test download speed from different locations
4. Check service status pages
5. Have backup mirrors ready

Remember: The goal is **fast, anonymous, and reliable** distribution without straining your Render server!

