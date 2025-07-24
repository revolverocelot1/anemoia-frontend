// Supabase configuration

// Determine the correct redirect URL based on environment
const getRedirectUrl = () => {
  const origin = window.location.origin;
  // Handle both hash routing and regular routing
  return `${origin}/auth/callback`;
};

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://qvqxkgescavccwgwttsp.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cXhrZ2VzY2F2Y2N3Z3d0dHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDI2NDAsImV4cCI6MjA2NzIxODY0MH0.ikL-yWy8t3pYo03FxA7QDV9PRavPLH1dt01KYZ8NsFE',
  auth: {
    redirectTo: getRedirectUrl(),
    flowType: 'implicit', // Explicitly set flow type
    providers: {
      google: {
        enabled: true,
        // Note: Google OAuth requires configuration in Supabase dashboard
        // 1. Go to Authentication > Providers > Google
        // 2. Enable Google provider
        // 3. Add your Client ID and Client Secret from Google Cloud Console
        // 4. Set redirect URL: https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback
      },
      twitter: {
        enabled: true,
        // Note: Twitter OAuth requires configuration in Supabase dashboard
        // 1. Go to Authentication > Providers > Twitter
        // 2. Enable Twitter provider
        // 3. Add your API Key and API Secret from Twitter Developer Portal
        // 4. Set callback URL: https://qvqxkgescavccwgwttsp.supabase.co/auth/v1/callback
      },
    },
    // Additional auth configuration
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
}; 