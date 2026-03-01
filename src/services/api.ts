import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    const resolvedBaseURL = (() => {
      const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
      if (envUrl && typeof envUrl === 'string' && envUrl.length > 0) return envUrl;
      if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:8000';
        }
        // Production URL - handle both onrender.com and anemoias.me
        if (window.location.hostname.includes('onrender.com') || window.location.hostname === 'anemoias.me') {
          return 'https://anemoia-api.onrender.com';
        }
      }
      // Fallback for production deployments
      return 'https://anemoia-api.onrender.com';
    })();

    this.instance = axios.create({
      baseURL: resolvedBaseURL,
      timeout: 120000, // 2 minutes timeout for Render free tier
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          // Optionally redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  // File upload method
  async upload(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.instance.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// Export singleton instance
const api = new ApiService();
export default api; 