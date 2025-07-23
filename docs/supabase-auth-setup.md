# Supabase Authentication Setup Guide

## Overview
This guide will help you set up OAuth authentication for Anemoia using Supabase with Google, Twitter, and GitHub providers.

## Prerequisites
- Supabase project (already created: qvqxkgescavccwgwttsp)
- Google Cloud Console account
- Twitter Developer account
- GitHub account

## Step 1: Configure Redirect URIs

The redirect URI for your Supabase project is:
```
https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback
```

## Step 2: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret

5. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Find Google
   - Enable Google provider
   - Paste your Client ID and Client Secret
   - Save

## Step 3: GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: Anemoia
   - Homepage URL: http://localhost:5173 (or your production URL)
   - Authorization callback URL: `https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback`
4. Register application
5. Copy Client ID and generate Client Secret

6. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Find GitHub
   - Enable GitHub provider
   - Paste your Client ID and Client Secret
   - Save

## Step 4: Twitter OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. In app settings:
   - Enable OAuth 2.0
   - Set callback URL: `https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

4. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Find Twitter
   - Enable Twitter provider
   - Paste your Client ID and Client Secret
   - Save

## Step 5: Update Local Configuration

Make sure your `.env.local` file has:
```
VITE_SUPABASE_URL=https://qvqxkgescavccwgwttsp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cXhrZ2VzY2F2Y2N3Z3d0dHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDI2NDAsImV4cCI6MjA2NzIxODY0MH0.ikL-yWy8t3pYo03FxA7QDV9PRavPLH1dt01KYZ8NsFE
```

## Step 6: Configure Supabase Auth Settings

In Supabase Dashboard > Authentication > Settings:
1. Site URL: `http://localhost:5173` (for development)
2. Redirect URLs: Add `http://localhost:5173/auth/callback`

## Troubleshooting

### Redirect URI Mismatch
If you see "redirect_uri_mismatch" error:
1. Ensure the exact redirect URI is added in the OAuth provider settings
2. The format should be: `https://[PROJECT_ID].supabase.co/auth/v1/callback`
3. No trailing slashes

### Testing Authentication
1. Start your development server: `npm run dev`
2. Navigate to http://localhost:5173/login
3. Click on any OAuth provider button
4. You should be redirected to the provider's login page
5. After successful login, you'll be redirected back to your app

## Important Links
- Supabase Dashboard: https://supabase.com/dashboard/project/qvqxkgescavccwgwttsp
- Auth Providers: https://supabase.com/dashboard/project/qvqxkgescavccwgwttsp/auth/providers
- Google Cloud Console: https://console.cloud.google.com/
- GitHub OAuth Apps: https://github.com/settings/developers
- Twitter Developer Portal: https://developer.twitter.com/ 