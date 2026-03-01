// Test setup file for Vitest
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Supabase Auth Context
vi.mock('@/context/SupabaseAuthContext', () => ({
  SupabaseAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useSupabaseAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

// Mock regular Auth Context
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Web Workers
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  
  postMessage(data: any) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: { type: 'mock-response', data } }));
      }
    }, 0);
  }
  
  terminate() {}
}

global.Worker = MockWorker as any;

// Mock WebGL
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: {},
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      viewport: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
    };
  }
  // Return 2D context mock for other cases
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  };
}); 