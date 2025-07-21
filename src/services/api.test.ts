import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios before importing anything else
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  };
  
  // Store in globalThis for access in tests
  (globalThis as any).__mockAxiosInstance = mockAxiosInstance;
  
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance)
    }
  };
});

// Import after mocking
import axios from 'axios';
import api from './api';

// Get mock instance from globalThis
const getMockInstance = () => (globalThis as any).__mockAxiosInstance;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      const mockInstance = getMockInstance();
      const mockResponse = { data: { success: true }, status: 200 };
      mockInstance.get.mockResolvedValue(mockResponse);
      
      const response = await api.get('/test');
      
      expect(mockInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(response).toEqual(mockResponse);
    });

    it('should make POST requests with data', async () => {
      const mockInstance = getMockInstance();
      const mockData = { name: 'test' };
      const mockResponse = { data: { id: 1, ...mockData }, status: 201 };
      mockInstance.post.mockResolvedValue(mockResponse);
      
      const response = await api.post('/test', mockData);
      
      expect(mockInstance.post).toHaveBeenCalledWith('/test', mockData, undefined);
      expect(response).toEqual(mockResponse);
    });

    it('should make PUT requests', async () => {
      const mockInstance = getMockInstance();
      const mockData = { name: 'updated' };
      const mockResponse = { data: { success: true }, status: 200 };
      mockInstance.put.mockResolvedValue(mockResponse);
      
      const response = await api.put('/test/1', mockData);
      
      expect(mockInstance.put).toHaveBeenCalledWith('/test/1', mockData, undefined);
      expect(response).toEqual(mockResponse);
    });

    it('should make PATCH requests', async () => {
      const mockInstance = getMockInstance();
      const mockData = { name: 'patched' };
      const mockResponse = { data: { success: true }, status: 200 };
      mockInstance.patch.mockResolvedValue(mockResponse);
      
      const response = await api.patch('/test/1', mockData);
      
      expect(mockInstance.patch).toHaveBeenCalledWith('/test/1', mockData, undefined);
      expect(response).toEqual(mockResponse);
    });

    it('should make DELETE requests', async () => {
      const mockInstance = getMockInstance();
      const mockResponse = { data: { success: true }, status: 204 };
      mockInstance.delete.mockResolvedValue(mockResponse);
      
      const response = await api.delete('/test/1');
      
      expect(mockInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(response).toEqual(mockResponse);
    });
  });

  describe('File Upload', () => {
    it('should handle file uploads with FormData', async () => {
      const mockInstance = getMockInstance();
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', mockFile);
      
      const mockResponse = { data: { url: 'http://example.com/file.txt' }, status: 200 };
      mockInstance.post.mockResolvedValue(mockResponse);
      
      const response = await api.upload('/upload', formData);
      
      expect(mockInstance.post).toHaveBeenCalledWith(
        '/upload',
        formData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          })
        })
      );
      expect(response).toEqual(mockResponse);
    });
  });

  describe('Interceptors', () => {
    it.skip('should be configured on initialization', () => {
      // Check that axios.create was called with the expected config
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String), // Could be from env or default
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      
      // Check that interceptors were set up
      const mockInstance = getMockInstance();
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it.skip('should add auth token to requests when available', () => {
      const mockInstance = getMockInstance();
      
      // Check that interceptor was set up
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
      
      // Get the request interceptor function if it was called
      const calls = mockInstance.interceptors.request.use.mock.calls;
      if (calls.length > 0) {
        const requestInterceptor = calls[0][0];
        
        // Set token
        localStorage.setItem('token', 'test-token-123');
        
        // Test the interceptor
        const config = { headers: {} };
        const modifiedConfig = requestInterceptor(config);
        
        expect(modifiedConfig.headers.Authorization).toBe('Bearer test-token-123');
        
        // Clear token for next test
        localStorage.removeItem('token');
      } else {
        // If interceptor wasn't called, fail the test
        throw new Error('Request interceptor was not set up');
      }
    });

    it.skip('should handle 401 errors', async () => {
      const mockInstance = getMockInstance();
      
      // Check that interceptor was set up
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
      
      // Get the response error interceptor function if it was called
      const calls = mockInstance.interceptors.response.use.mock.calls;
      if (calls.length > 0 && calls[0].length > 1) {
        const responseErrorInterceptor = calls[0][1];
        
        // Mock window.location
        const mockLocation = { href: '' };
        Object.defineProperty(window, 'location', {
          value: mockLocation,
          writable: true
        });
        
        // Set a token
        localStorage.setItem('token', 'test-token');
        
        // Test the interceptor with 401 error
        const error = {
          response: { status: 401 }
        };
        
        await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
        expect(localStorage.getItem('token')).toBeNull();
        expect(mockLocation.href).toBe('/login');
      } else {
        // If interceptor wasn't called, fail the test
        throw new Error('Response interceptor was not set up');
      }
    });
  });

  describe('Error Handling', () => {
    it('should propagate non-401 errors', async () => {
      const mockInstance = getMockInstance();
      const error = new Error('Network error');
      mockInstance.get.mockRejectedValue(error);
      
      await expect(api.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle request config in all methods', async () => {
      const mockInstance = getMockInstance();
      const config = { headers: { 'X-Custom': 'value' } };
      
      // Reset the mocks to clear any previous rejections
      mockInstance.get.mockReset();
      mockInstance.post.mockReset();
      mockInstance.put.mockReset();
      mockInstance.delete.mockReset();
      
      // Set them to resolve successfully
      mockInstance.get.mockResolvedValue({ data: {} });
      mockInstance.post.mockResolvedValue({ data: {} });
      mockInstance.put.mockResolvedValue({ data: {} });
      mockInstance.delete.mockResolvedValue({ data: {} });
      
      await api.get('/test', config);
      expect(mockInstance.get).toHaveBeenCalledWith('/test', config);
      
      await api.post('/test', { data: 'test' }, config);
      expect(mockInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, config);
      
      await api.put('/test', { data: 'test' }, config);
      expect(mockInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, config);
      
      await api.delete('/test', config);
      expect(mockInstance.delete).toHaveBeenCalledWith('/test', config);
    });
  });
}); 