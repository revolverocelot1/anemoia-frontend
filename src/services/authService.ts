// Authentication Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://anemoia-api.onrender.com';

// TestMail.app configuration
const TESTMAIL_API_KEY = '94149e1b-4ea7-4845-ad0c-d2c1c59e493a';
const TESTMAIL_NAMESPACE = 'mc639';

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  anemo_id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  provider?: 'local' | 'google' | 'twitter';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  // Sign up with email/password
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        testmail: {
          apiKey: TESTMAIL_API_KEY,
          namespace: TESTMAIL_NAMESPACE,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    return response.json();
  }

  // Login with email/password
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        testmail: {
          apiKey: TESTMAIL_API_KEY,
          namespace: TESTMAIL_NAMESPACE,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset request failed');
    }

    return response.json();
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset failed');
    }

    return response.json();
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Email verification failed');
    }

    return response.json();
  }

  // Get user profile
  async getProfile(token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch profile');
    }

    return response.json();
  }

  // Update user profile
  async updateProfile(token: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    return response.json();
  }

  // Delete account
  async deleteAccount(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }

    return response.json();
  }

  // Check TestMail.app for emails
  async getTestEmails(email: string): Promise<any[]> {
    const tag = email.split('@')[0];
    const response = await fetch(
      `https://api.testmail.app/api/json?apikey=${TESTMAIL_API_KEY}&namespace=${TESTMAIL_NAMESPACE}&tag=${tag}&limit=10`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch test emails');
    }

    const data = await response.json();
    return data.emails || [];
  }
}

export const authService = new AuthService(); 