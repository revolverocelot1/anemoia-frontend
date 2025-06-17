// No explicit React import needed with the new JSX transform

const LoginPage = () => {
  const handleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <main className="flex items-center justify-center min-h-[60vh] px-4 py-20">
      <div className="bg-[var(--secondary-color)] rounded-xl shadow-lg p-10 w-full max-w-md text-center space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Sign in to Anemoia</h2>
        <p className="text-[var(--text-secondary)] text-sm">Securely authenticate with your Google account.</p>
        <button
          onClick={handleLogin}
          className="group w-full flex items-center justify-center gap-3 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[var(--primary-color)] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[var(--primary-color)] transition-colors"
        >
          <svg className="h-6 w-6" height="24" viewBox="0 0 48 48" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"></path>
            <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"></path>
            <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"></path>
            <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,36.096,44,30.693,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"></path>
          </svg>
          Continue with Google
        </button>
        <p className="text-xs text-[var(--text-secondary)]">You will be redirected to Google to complete the authentication.</p>
      </div>
    </main>
  );
};

export default LoginPage; 