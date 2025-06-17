import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const { token, isAuthenticated } = useAuth();

  const userId = (() => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.user_id || null;
    } catch {
      return null;
    }
  })();

  if (!isAuthenticated) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">You are not signed in.</h2>
        <p className="text-[var(--text-secondary)]">Please sign in via the header to access settings.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-[60vh] p-10">
      <div className="bg-[var(--secondary-color)] rounded-xl shadow-lg p-8 w-full max-w-lg space-y-6">
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">User Settings</h2>
        <div className="space-y-2 text-left">
          <p className="text-sm text-[var(--text-secondary)]">Google account linked.</p>
          <p className="text-sm text-[var(--text-secondary)]">ANEMO User ID:</p>
          <p className="text-lg font-mono text-[var(--text-primary)] break-all bg-[#223649] rounded px-3 py-2">
            {userId || 'N/A'}
          </p>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage; 