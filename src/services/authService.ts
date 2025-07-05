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
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  // Sign up with email/password
  async signup(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}${name ? `&name=${encodeURIComponent(name)}` : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  // Login with email/password
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  // Demo login (no credentials needed)
  async demoLogin(): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Demo login failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch profile');
    }

    return response.json();
  }

  // Logout
  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }

  // Set token and save to localStorage
  private setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Get stored user info
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Store user info
  storeUser(user: User): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
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