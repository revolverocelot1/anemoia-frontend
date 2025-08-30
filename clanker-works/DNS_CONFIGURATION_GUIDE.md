# DNS Configuration Guide for clanker.works

## Current Status
- ✅ Website deployed to Vercel at: https://website-ox6hpksdf-revolverocelot1s-projects.vercel.app
- ✅ Domain clanker.works added to Vercel project
- ✅ DNS records configured in Vercel
- ❌ Nameservers at name.com not pointing to Vercel (causing parked page to show)

## Required DNS Configuration at name.com

### Step-by-Step Instructions

1. **Log into name.com**
   - Visit: https://www.name.com/account/login
   - Username: revolverocelot
   - Password: ocelot@1
   - Note: You may need to verify via email (srushtiraj.patil20@vit.edu)

2. **Navigate to Domain Management**
   - After login, go to: https://www.name.com/account/domain/details/clanker.works
   - Or from dashboard: Click on "My Domains" → Select "clanker.works"

3. **Change Nameservers**
   - Find the "Nameservers" or "DNS" section
   - Look for option to "Change Nameservers" or "Use Custom Nameservers"
   - Replace current nameservers with Vercel's nameservers:
     - **ns1.vercel-dns.com**
     - **ns2.vercel-dns.com**
   - Save the changes

4. **Wait for DNS Propagation**
   - DNS changes can take 1-48 hours to propagate globally
   - Typically takes 1-4 hours for most locations

## Alternative: Using A Records (if nameserver change not possible)

If you cannot change nameservers, you can configure DNS records directly at name.com:

1. **Keep name.com nameservers**
2. **Add these DNS records in name.com DNS management:**
   - **A Record**: Host: @ (or blank), Points to: 76.76.21.21
   - **A Record**: Host: www, Points to: 76.76.21.21
   - **CNAME Record** (optional): Host: *, Points to: cname.vercel-dns.com

## Verification Steps

Once DNS is configured:

1. **Check DNS propagation:**
   - Visit: https://www.whatsmydns.net/
   - Enter: clanker.works
   - Check if A records show 76.76.21.21

2. **Test the website:**
   - Visit: https://clanker.works
   - Should show the B1 Battledroid video website instead of parked page

3. **Verify in Vercel:**
   - Go to: https://vercel.com/revolverocelot1s-projects/website/settings/domains
   - Domain status should show as "Valid Configuration" with green checkmark

## Troubleshooting

- If still showing parked page after 48 hours:
  - Clear browser cache and cookies
  - Try accessing in incognito/private mode
  - Check if nameservers were saved correctly in name.com

- If Vercel shows configuration errors:
  - Ensure no conflicting DNS records exist
  - Remove any existing A/CNAME records that don't match Vercel's requirements

## Support Contacts

- **name.com Support**: https://www.name.com/support
- **Vercel Support**: https://vercel.com/help

Last updated: January 29, 2025