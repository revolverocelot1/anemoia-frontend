# GitHub OAuth Setup Guide for Anemoia Frontend

## Prerequisites
- GitHub account (already logged in)
- Supabase project
- Application URL (for local development: http://localhost:5173)

## Step 1: Create GitHub OAuth App

### Navigate to GitHub OAuth Settings
1. Go to GitHub.com (you're already logged in)
2. Click your profile picture (top-right corner)
3. Click **Settings**
4. Scroll down and click **Developer settings** (left sidebar)
5. Click **OAuth Apps** (left sidebar)
6. Click **New OAuth App** button

### Fill in the Application Details
Use these values for your OAuth app:

```
Application name: Anemoia AI Video Tools
Homepage URL: http://localhost:5173
Application description: AI-powered video editing and subtitle tools
Authorization callback URL: http://localhost:5173/auth/callback/github
```

For production, replace `http://localhost:5173` with your actual domain.

### Register the Application
1. Click **Register application**
2. You'll see your new app's page with:
   - **Client ID** (visible immediately)
   - **Client secrets** (click "Generate a new client secret")
3. **IMPORTANT**: Copy both values immediately. The secret won't be shown again!

## Step 2: Configure Supabase

### Add GitHub Provider to Supabase
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** in the list
4. Toggle it **ON**
5. Enter your GitHub OAuth credentials:
   - **Client ID**: (paste from GitHub)
   - **Client Secret**: (paste from GitHub)
6. The **Redirect URL** shown by Supabase should match your GitHub callback URL
7. Click **Save**

### Update Redirect URLs in Supabase
1. Go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/auth/callback
   http://localhost:5173/auth/callback/github
   http://localhost:5173/subtitle
   ```
3. For production, add your production URLs

## Step 3: Test the Integration

### Local Testing
1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to http://localhost:5173/login
3. Click "Continue with GitHub"
4. You should be redirected to GitHub to authorize
5. After authorizing, you'll be redirected back to your app

### Verify the Implementation
The authentication flow is already implemented in your codebase:
- `/src/services/auth.service.ts` - Contains `githubLogin()` method
- `/src/pages/OAuthCallbackPage.tsx` - Handles the OAuth callback
- `/src/pages/LoginPage.tsx` - Has the GitHub login button

## Step 4: Environment Variables

Make sure your `.env` file has the correct Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch" error**
   - Ensure the callback URL in GitHub exactly matches Supabase's redirect URL
   - Check for trailing slashes - they matter!

2. **"Invalid client" error**
   - Double-check Client ID and Secret are correctly copied
   - Ensure no extra spaces or characters

3. **Redirect not working after login**
   - Check browser console for errors
   - Verify all redirect URLs are whitelisted in Supabase

### Testing with Different URLs

For different environments, update both GitHub OAuth app and Supabase redirect URLs:

| Environment | GitHub Callback URL | Supabase Redirect URLs |
|------------|-------------------|----------------------|
| Local | http://localhost:5173/auth/callback/github | http://localhost:5173/* |
| Staging | https://staging.yourapp.com/auth/callback/github | https://staging.yourapp.com/* |
| Production | https://yourapp.com/auth/callback/github | https://yourapp.com/* |

## Security Notes

1. **Never commit secrets**: Keep your Client Secret secure
2. **Use environment variables**: Store sensitive data in `.env` files
3. **Rotate secrets regularly**: If compromised, regenerate immediately
4. **Limit OAuth scopes**: Only request necessary permissions

## Next Steps

1. Test the authentication flow thoroughly
2. Implement proper error handling
3. Add user profile management
4. Set up role-based access control if needed

---

**Note**: This guide assumes you're using Supabase for authentication. The implementation in your codebase is already set up to work with Supabase's OAuth integration. 