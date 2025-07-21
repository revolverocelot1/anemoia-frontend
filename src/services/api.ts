import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 30000,
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