import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create: vi.fn()
  }
}));

// Example API service
class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getUser(id: string) {
    const response = await axios.get(`${this.baseURL}/users/${id}`);
    return response.data;
  }

  async createUser(userData: any) {
    const response = await axios.post(`${this.baseURL}/users`, userData);
    return response.data;
  }

  async updateUser(id: string, userData: any) {
    const response = await axios.put(`${this.baseURL}/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await axios.delete(`${this.baseURL}/users/${id}`);
    return response.data;
  }

  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${this.baseURL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }
}

describe('ApiService', () => {
  let apiService: ApiService;
  const mockAxios = axios as unknown as {
    get: MockedFunction<any>;
    post: MockedFunction<any>;
    put: MockedFunction<any>;
    delete: MockedFunction<any>;
    create: MockedFunction<any>;
  };

  beforeEach(() => {
    apiService = new ApiService('https://api.example.com');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should fetch user by id', async () => {
      const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };
      mockAxios.get.mockResolvedValueOnce({ data: mockUser });

      const result = await apiService.getUser('123');

      expect(mockAxios.get).toHaveBeenCalledWith('https://api.example.com/users/123');
      expect(result).toEqual(mockUser);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'User not found';
      mockAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(apiService.getUser('999')).rejects.toThrow(errorMessage);
      expect(mockAxios.get).toHaveBeenCalledWith('https://api.example.com/users/999');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = { name: 'Jane Doe', email: 'jane@example.com' };
      const mockResponse = { id: '124', ...userData };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.createUser(userData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.example.com/users',
        userData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const userData = { name: '' }; // Invalid data
      const errorResponse = {
        response: {
          status: 400,
          data: { error: 'Name is required' }
        }
      };
      mockAxios.post.mockRejectedValueOnce(errorResponse);

      try {
        await apiService.createUser(userData);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Name is required');
      }
    });
  });

  describe('updateUser', () => {
    it('should update existing user', async () => {
      const userId = '123';
      const updateData = { name: 'John Updated' };
      const mockResponse = { id: userId, name: 'John Updated', email: 'john@example.com' };
      mockAxios.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.updateUser(userId, updateData);

      expect(mockAxios.put).toHaveBeenCalledWith(
        `https://api.example.com/users/${userId}`,
        updateData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = '123';
      const mockResponse = { success: true, message: 'User deleted' };
      mockAxios.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.deleteUser(userId);

      expect(mockAxios.delete).toHaveBeenCalledWith(
        `https://api.example.com/users/${userId}`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle unauthorized deletion', async () => {
      const userId = '123';
      const errorResponse = {
        response: {
          status: 403,
          data: { error: 'Unauthorized' }
        }
      };
      mockAxios.delete.mockRejectedValueOnce(errorResponse);

      try {
        await apiService.deleteUser(userId);
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('Unauthorized');
      }
    });
  });

  describe('uploadFile', () => {
    it('should upload file with progress tracking', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockResponse = { fileId: 'abc123', url: 'https://example.com/files/abc123' };
      const progressCallback = vi.fn();

      mockAxios.post.mockImplementation((url, data, config) => {
        // Simulate progress events
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 } as any);
          config.onUploadProgress({ loaded: 100, total: 100 } as any);
        }
        return Promise.resolve({ data: mockResponse });
      });

      const result = await apiService.uploadFile(file, progressCallback);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.example.com/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function)
        })
      );

      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockResponse);
    });

    it('should handle file upload errors', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const errorMessage = 'File too large';
      mockAxios.post.mockRejectedValueOnce(new Error(errorMessage));

      await expect(apiService.uploadFile(file)).rejects.toThrow(errorMessage);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network timeout', async () => {
      const timeoutError: any = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxios.get.mockRejectedValueOnce(timeoutError);

      try {
        await apiService.getUser('123');
      } catch (error: any) {
        expect(error.message).toBe('Network timeout');
        expect(error.code).toBe('ECONNABORTED');
      }
    });

    it('should handle no internet connection', async () => {
      const networkError: any = new Error('Network Error');
      networkError.code = 'ERR_NETWORK';
      mockAxios.get.mockRejectedValueOnce(networkError);

      try {
        await apiService.getUser('123');
      } catch (error: any) {
        expect(error.message).toBe('Network Error');
        expect(error.code).toBe('ERR_NETWORK');
      }
    });
  });

  describe('Request Interceptors', () => {
    it('should add auth token to requests', async () => {
      // Example of testing with interceptors
      const authToken = 'Bearer token123';
      const mockUser = { id: '123', name: 'John Doe' };
      
      // Mock axios create with interceptors
      const mockAxiosInstance = {
        get: vi.fn().mockResolvedValue({ data: mockUser }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      };
      
      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
      
      // Test implementation would depend on your actual auth setup
    });
  });
}); 