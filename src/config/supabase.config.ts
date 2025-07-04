// Supabase configuration
export const supabaseConfig = {
  url: 'https://wnybqxizsqzxphfplpdb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueWJxeGl6c3F6eHBoZnBscGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDQ0ODgsImV4cCI6MjA1MTA4MDQ4OH0.eaYq8nE-5i1-Y7kkJGsKu5cLBXJX3fNJz2eCMkQOLxs',
  auth: {
    redirectTo: window.location.origin + '/auth/callback',
    providers: {
      google: {
        enabled: true,
        clientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      },
      twitter: {
        enabled: true,
      },
    },
  },
}; 