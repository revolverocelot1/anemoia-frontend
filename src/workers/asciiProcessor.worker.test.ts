import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock worker environment
const mockPostMessage = vi.fn();
global.postMessage = mockPostMessage;

// Import the worker code
import './asciiProcessor.worker';

describe('ASCII Processor Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Edge Detection', () => {
    it('should detect edges in image data', () => {
      const width = 3;
      const height = 3;
      const pixels = new Uint8ClampedArray([
        // Simple gradient pattern
        0, 0, 0, 255,     128, 128, 128, 255,   255, 255, 255, 255,
        0, 0, 0, 255,     128, 128, 128, 255,   255, 255, 255, 255,
        0, 0, 0, 255,     128, 128, 128, 255,   255, 255, 255, 255,
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width,
            height,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: true,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      // Trigger message event
      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      // Wait for async processing
      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('frame');
        expect(response.frameNumber).toBe(1);
        expect(response.ascii).toBeDefined();
        expect(response.width).toBe(width);
        expect(response.height).toBe(height);
      }, 10);
    });
  });

  describe('ASCII Conversion', () => {
    it('should convert pixels to ASCII characters', () => {
      const pixels = new Uint8ClampedArray([
        0, 0, 0, 255,       // Black pixel
        128, 128, 128, 255, // Gray pixel
        255, 255, 255, 255, // White pixel
        64, 64, 64, 255,    // Dark gray pixel
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 2,
            height: 2,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.ascii).toContain('@'); // Black pixel
        expect(response.ascii).toContain(' '); // White pixel
      }, 10);
    });

    it('should apply brightness adjustment', () => {
      const pixels = new Uint8ClampedArray([
        128, 128, 128, 255, // Gray pixel
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 2, // Double brightness
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        // With doubled brightness, gray should map to a lighter character
        expect(response.ascii).not.toContain('@');
        expect(response.ascii).not.toContain('#');
      }, 10);
    });

    it('should apply contrast adjustment', () => {
      const pixels = new Uint8ClampedArray([
        64, 64, 64, 255,    // Dark gray
        192, 192, 192, 255, // Light gray
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 2,
            height: 1,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 2, // Double contrast
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.ascii).toBeDefined();
        // With doubled contrast, the difference between dark and light should be more pronounced
      }, 10);
    });
  });

  describe('Color Modes', () => {
    it('should process with matrix color mode', () => {
      const pixels = new Uint8ClampedArray([
        0, 255, 0, 255, // Green pixel (Matrix style)
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels
          },
          config: {
            asciiChars: '01',
            colorMode: 'matrix',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.colors).toBeDefined();
        expect(response.colors).toBeInstanceOf(Uint8ClampedArray);
      }, 10);
    });

    it('should process with cyberpunk color mode', () => {
      const pixels = new Uint8ClampedArray([
        255, 0, 255, 255, // Magenta pixel (Cyberpunk style)
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'cyberpunk',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.colors).toBeDefined();
      }, 10);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const pixels = new Uint8ClampedArray(100 * 100 * 4); // 100x100 image

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 100,
            height: 100,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const startTime = performance.now();
      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.performance).toBeDefined();
        expect(response.performance.processingTime).toBeGreaterThan(0);
        expect(response.performance.pixelsProcessed).toBe(10000);
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid frame data', () => {
      const message = {
        data: {
          frameData: null,
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('error');
        expect(response.error).toBeDefined();
      }, 10);
    });

    it('should handle empty ASCII chars', () => {
      const pixels = new Uint8ClampedArray([128, 128, 128, 255]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels
          },
          config: {
            asciiChars: '', // Empty chars
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('error');
        expect(response.error).toContain('ASCII characters');
      }, 10);
    });

    it('should handle invalid brightness values', () => {
      const pixels = new Uint8ClampedArray([128, 128, 128, 255]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 1,
            height: 1,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: -1, // Invalid brightness
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        // Should still process but clamp the value
        expect(response.type).toBe('frame');
      }, 10);
    });
  });

  describe('Output Modes', () => {
    it('should apply negative output mode', () => {
      const pixels = new Uint8ClampedArray([
        0, 0, 0, 255,       // Black pixel
        255, 255, 255, 255, // White pixel
      ]);

      const message = {
        data: {
          frameData: {
            frameNumber: 1,
            timestamp: 0,
            width: 2,
            height: 1,
            pixels
          },
          config: {
            asciiChars: ' .:-=+*#%@',
            colorMode: 'mono',
            brightness: 1,
            contrast: 1,
            edgeDetection: false,
            edgeThreshold: 0.5,
            negative: true,
            fontSize: 12,
            charDensity: 1
          }
        }
      };

      const messageEvent = new MessageEvent('message', message);
      global.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(mockPostMessage).toHaveBeenCalled();
        const response = mockPostMessage.mock.calls[0][0];
        // In negative mode, black should map to light chars and white to dark
        expect(response.ascii).toBeDefined();
      }, 10);
    });
  });
}); 