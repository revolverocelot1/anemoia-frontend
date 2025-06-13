import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export function AccountPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auth success in URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // In a real app, you'd get the JWT token here
      // For demo, we'll just fetch the mock profile
      fetchProfile();
    } else if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('https://anemoia-api.onrender.com/api/user');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'https://anemoia-api.onrender.com/auth/google';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={profile.picture}
              alt="Profile"
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <p className="text-gray-600">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Account Info</h3>
              <p><strong>ID:</strong> {profile.id}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Name:</strong> {profile.name}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href="/depth-map"
                  className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded transition duration-200"
                >
                  Depth Map Generator
                </a>
                <a
                  href="/pose-estimation"
                  className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-2 px-4 rounded transition duration-200"
                >
                  Pose Estimation
                </a>
                <button
                  onClick={logout}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition duration-200"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 