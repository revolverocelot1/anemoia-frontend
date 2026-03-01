# Supabase Authentication Setup Guide

## 1. Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://wnybqxizsqzxphfplpdb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueWJxeGl6c3F6eHBoZnBscGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDQ0ODgsImV4cCI6MjA1MTA4MDQ4OH0.eaYq8nE-5i1-Y7kkJGsKu5cLBXJX3fNJz2eCMkQOLxs
```

## 2. Database Setup

Run this SQL in your Supabase SQL editor to create the profiles table:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT CHECK (provider IN ('google', 'twitter', 'github')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## 3. OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth client ID
5. Choose "Web application"
6. Add authorized redirect URI: `https://wnybqxizsqzxphfplpdb.supabase.co/auth/v1/callback`
7. Copy Client ID and Client Secret

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL: `http://localhost:5173` (or your production URL)
4. Set Authorization callback URL: `https://wnybqxizsqzxphfplpdb.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret

### Twitter OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Set Callback URL: `https://wnybqxizsqzxphfplpdb.supabase.co/auth/v1/callback`
5. Copy API Key and API Secret

## 4. Supabase Dashboard Configuration

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to Authentication → Providers
3. Enable and configure each provider with the credentials from above

### URL Configuration

Go to Authentication → URL Configuration and set:

- **Site URL**: `http://localhost:5173` (for development)
- **Redirect URLs**: 
  - `http://localhost:5173/auth/callback`
  - `https://yourdomain.com/auth/callback` (for production)

## 5. Testing

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. Try logging in with each provider
4. Check the browser console for any errors
5. Verify user is created in Supabase Dashboard → Authentication → Users

## Common Issues

1. **Redirect mismatch error**: Make sure the redirect URL in your OAuth app matches exactly with Supabase
2. **CORS errors**: Add your domain to allowed origins in Supabase
3. **Profile not found**: This is normal for new users, the profile will be created automatically
4. **OAuth not working**: Double-check that providers are enabled in Supabase dashboard 