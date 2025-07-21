import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  
  postMessage(data: any) {
    // Simulate worker processing
    setTimeout(() => {
      if (this.onmessage) {
        const response = this.processMessage(data);
        this.onmessage(new MessageEvent('message', { data: response }));
      }
    }, 0);
  }
  
  private processMessage(data: any) {
    if (!data.type || data.type !== 'processFrame') {
      return { type: 'error', error: 'Invalid message type' };
    }
    
    const { frameData, config } = data.data;
    
    if (!frameData || !frameData.pixels) {
      return { type: 'error', error: 'Invalid frame data' };
    }
    
    if (!config.asciiChars || config.asciiChars.length === 0) {
      return { type: 'error', error: 'ASCII characters required' };
    }
    
    // Simulate ASCII conversion
    const { width, height } = frameData;
    const ascii = this.generateMockAscii(width, height, config);
    const colors = config.colored ? new Uint8ClampedArray(width * height * 3) : null;
    
    return {
      type: 'frameProcessed',
      data: {
        frameNumber: frameData.frameNumber,
        timestamp: frameData.timestamp,
        ascii,
        colors,
        width,
        height,
        performance: {
          processingTime: 10,
          pixelsProcessed: width * height
        }
      }
    };
  }
  
  private generateMockAscii(width: number, height: number, config: any): string {
    const { asciiChars } = config;
    const lines: string[] = [];
    
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        // Use different characters based on position for testing
        const charIndex = (x + y) % asciiChars.length;
        line += asciiChars[charIndex];
      }
      lines.push(line);
    }
    
    return lines.join('\n');
  }
  
  terminate() {}
}

// Mock the worker module
vi.mock('./asciiProcessor.worker', () => ({
  default: MockWorker
}));

describe('ASCII Processor Worker', () => {
  let mockWorker: MockWorker;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorker = new MockWorker();
  });

  describe('Message Processing', () => {
    it('should process frame data correctly', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      const testData = {
        type: 'processFrame',
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 3,
            height: 3,
            pixels: new Uint8ClampedArray(3 * 3 * 4)
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1,
            colored: false
          }
        }
      };
      
      mockWorker.postMessage(testData);
      
      // Wait for async processing
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.type).toBe('frameProcessed');
      expect(response.data.frameNumber).toBe(1);
      expect(response.data.ascii).toBeDefined();
      expect(response.data.width).toBe(3);
      expect(response.data.height).toBe(3);
    });

    it('should handle colored output', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      const testData = {
        type: 'processFrame',
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 2,
            height: 2,
            pixels: new Uint8ClampedArray(2 * 2 * 4)
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'matrix',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1,
            colored: true
          }
        }
      };
      
      mockWorker.postMessage(testData);
      
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.data.colors).toBeDefined();
      expect(response.data.colors).toBeInstanceOf(Uint8ClampedArray);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message type', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      mockWorker.postMessage({ type: 'invalid' });
      
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.type).toBe('error');
      expect(response.error).toContain('Invalid message type');
    });

    it('should handle missing frame data', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      const testData = {
        type: 'processFrame',
        data: {
          frameData: null,
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono'
          }
        }
      };
      
      mockWorker.postMessage(testData);
      
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.type).toBe('error');
      expect(response.error).toContain('Invalid frame data');
    });

    it('should handle empty ASCII chars', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      const testData = {
        type: 'processFrame',
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels: new Uint8ClampedArray(1 * 1 * 4)
          },
          config: {
            asciiChars: '', // Empty chars
            colorMode: 'mono'
          }
        }
      };
      
      mockWorker.postMessage(testData);
      
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.type).toBe('error');
      expect(response.error).toContain('ASCII characters');
    });
  });

  describe('Performance Monitoring', () => {
    it('should include performance metrics', async () => {
      const mockCallback = vi.fn();
      mockWorker.onmessage = mockCallback;
      
      const testData = {
        type: 'processFrame',
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 10,
            height: 10,
            pixels: new Uint8ClampedArray(10 * 10 * 4)
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            colored: false
          }
        }
      };
      
      mockWorker.postMessage(testData);
      
      await vi.waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      const response = mockCallback.mock.calls[0][0].data;
      expect(response.data.performance).toBeDefined();
      expect(response.data.performance.processingTime).toBeGreaterThan(0);
      expect(response.data.performance.pixelsProcessed).toBe(100);
    });
  });
}); 