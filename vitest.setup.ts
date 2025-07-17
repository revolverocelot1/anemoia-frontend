import { vi } from 'vitest';

// Mock global objects if needed
global.HTMLCanvasElement.prototype.getContext = () => ({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  // Add other ctx methods as needed
} as any);

global.HTMLVideoElement.prototype.play = vi.fn();
global.HTMLVideoElement.prototype.pause = vi.fn();
// Etc. for other mocks 