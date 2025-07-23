# Supabase Setup Guide for Anemoia

## 1. Create a Free Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up with GitHub (recommended) or email
4. Create a new project with:
   - Project name: `anemoia-auth`
   - Database password: (save this securely)
   - Region: Choose closest to your users

## 2. Configure Authentication Providers

### Enable OAuth Providers:

1. Go to Authentication → Providers in Supabase dashboard
2. Enable and configure:

#### Google OAuth:
- Enable Google provider
- Add your Google OAuth credentials:
  - Client ID: (from Google Cloud Console)
  - Client Secret: (from Google Cloud Console)
- Authorized redirect URIs: 
  - `https://your-project.supabase.co/auth/v1/callback`
  - `http://localhost:5173/auth/callback`
  - `https://anemoia-web.onrender.com/auth/callback`

#### Twitter/X OAuth:
- Enable Twitter provider
- Add your Twitter App credentials:
  - API Key: (from Twitter Developer Portal)
  - API Secret: (from Twitter Developer Portal)
- Callback URLs in Twitter App:
  - `https://your-project.supabase.co/auth/v1/callback`

#### GitHub OAuth:
- Enable GitHub provider
- Add GitHub OAuth App credentials:
  - Client ID: (from GitHub Settings → Developer settings)
  - Client Secret: (from GitHub OAuth App)

## 3. Create Database Tables

Run this SQL in the SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT CHECK (provider IN ('google', 'twitter', 'github')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 4. Get Your API Keys

1. Go to Settings → API in Supabase dashboard
2. Copy:
   - Project URL: `https://your-project.supabase.co`
   - Anon/Public key: `eyJ...` (safe to use in frontend)

## 5. Configure Environment Variables

Create `.env.local` in your frontend:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

## 6. Update Backend (if needed)

For server-side operations, use the service role key:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-key...
```

## 7. Configure Redirect URLs

In Supabase Authentication → URL Configuration:
- Site URL: `https://anemoia-web.onrender.com`
- Redirect URLs:
  - `http://localhost:5173/auth/callback`
  - `https://anemoia-web.onrender.com/auth/callback`

## Testing

1. Run your app locally
2. Try signing in with each provider
3. Check the profiles table in Supabase to see user data

## Troubleshooting

- **Redirect loop**: Check redirect URLs match exactly
- **Twitter blank page**: Ensure Twitter app has proper permissions
- **Google auth fails**: Verify OAuth consent screen is configured
- **No user data**: Check database triggers are working

## Free Tier Limits

Supabase free tier includes:
- 500MB database
- 2GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

Perfect for getting started! 