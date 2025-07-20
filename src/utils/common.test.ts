import { describe, it, expect } from 'vitest';

// Common utility functions tests
describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });
  });

  describe('isValidImageFile', () => {
    const isValidImageFile = (file: File): boolean => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
      return validTypes.includes(file.type);
    };

    it('should validate image file types', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
      const bmpFile = new File([''], 'test.bmp', { type: 'image/bmp' });
      
      expect(isValidImageFile(jpegFile)).toBe(true);
      expect(isValidImageFile(pngFile)).toBe(true);
      expect(isValidImageFile(gifFile)).toBe(true);
      expect(isValidImageFile(webpFile)).toBe(true);
      expect(isValidImageFile(bmpFile)).toBe(true);
    });

    it('should reject non-image file types', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      
      expect(isValidImageFile(textFile)).toBe(false);
      expect(isValidImageFile(pdfFile)).toBe(false);
      expect(isValidImageFile(videoFile)).toBe(false);
    });
  });

  describe('isValidVideoFile', () => {
    const isValidVideoFile = (file: File): boolean => {
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
      return validTypes.includes(file.type);
    };

    it('should validate video file types', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
      const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
      const oggFile = new File([''], 'test.ogg', { type: 'video/ogg' });
      const movFile = new File([''], 'test.mov', { type: 'video/quicktime' });
      
      expect(isValidVideoFile(mp4File)).toBe(true);
      expect(isValidVideoFile(webmFile)).toBe(true);
      expect(isValidVideoFile(oggFile)).toBe(true);
      expect(isValidVideoFile(movFile)).toBe(true);
    });

    it('should reject non-video file types', () => {
      const imageFile = new File([''], 'test.png', { type: 'image/png' });
      const audioFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      expect(isValidVideoFile(imageFile)).toBe(false);
      expect(isValidVideoFile(audioFile)).toBe(false);
      expect(isValidVideoFile(textFile)).toBe(false);
    });
  });

  describe('clamp', () => {
    const clamp = (value: number, min: number, max: number): number => {
      return Math.min(Math.max(value, min), max);
    };

    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp values below minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -10, 10)).toBe(-10);
    });

    it('should clamp values above maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -10, 10)).toBe(10);
    });
  });

  describe('debounce', () => {
    const debounce = <T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): ((...args: Parameters<T>) => void) => {
      let timeout: NodeJS.Timeout | undefined;
      
      return function executedFunction(...args: Parameters<T>) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    it('should debounce function calls', async () => {
      let callCount = 0;
      const testFunc = () => {
        callCount++;
      };
      
      const debouncedFunc = debounce(testFunc, 100);
      
      // Call multiple times quickly
      debouncedFunc();
      debouncedFunc();
      debouncedFunc();
      
      // Should not have been called yet
      expect(callCount).toBe(0);
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should have been called once
      expect(callCount).toBe(1);
    });
  });

  describe('throttle', () => {
    const throttle = <T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): ((...args: Parameters<T>) => void) => {
      let inThrottle: boolean;
      
      return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };

    it('should throttle function calls', async () => {
      let callCount = 0;
      const testFunc = () => {
        callCount++;
      };
      
      const throttledFunc = throttle(testFunc, 100);
      
      // First call should execute immediately
      throttledFunc();
      expect(callCount).toBe(1);
      
      // Subsequent calls within throttle period should be ignored
      throttledFunc();
      throttledFunc();
      expect(callCount).toBe(1);
      
      // Wait for throttle period
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Next call should execute
      throttledFunc();
      expect(callCount).toBe(2);
    });
  });

  describe('deepClone', () => {
    const deepClone = <T>(obj: T): T => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime()) as any;
      if (obj instanceof Array) {
        const clonedArr: any[] = [];
        obj.forEach((element, index) => {
          clonedArr[index] = deepClone(element);
        });
        return clonedArr as any;
      }
      if (obj instanceof Object) {
        const clonedObj: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
          }
        }
        return clonedObj;
      }
      return obj;
    };

    it('should deep clone objects', () => {
      const original = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [1, 2, { g: 4 }]
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
      expect(cloned.f).not.toBe(original.f);
    });

    it('should handle special types', () => {
      const date = new Date();
      const clonedDate = deepClone(date);
      
      expect(clonedDate).toEqual(date);
      expect(clonedDate).not.toBe(date);
      
      const nullValue = deepClone(null);
      expect(nullValue).toBe(null);
      
      const undefinedValue = deepClone(undefined);
      expect(undefinedValue).toBe(undefined);
      
      const numberValue = deepClone(42);
      expect(numberValue).toBe(42);
      
      const stringValue = deepClone('hello');
      expect(stringValue).toBe('hello');
    });
  });

  describe('generateUniqueId', () => {
    const generateUniqueId = (): string => {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    it('should generate unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      const id3 = generateUniqueId();
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should generate string IDs', () => {
      const id = generateUniqueId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('parseJSON', () => {
    const parseJSON = <T>(json: string, fallback: T): T => {
      try {
        return JSON.parse(json);
      } catch {
        return fallback;
      }
    };

    it('should parse valid JSON', () => {
      expect(parseJSON('{"a": 1}', {})).toEqual({ a: 1 });
      expect(parseJSON('[1, 2, 3]', [])).toEqual([1, 2, 3]);
      expect(parseJSON('"hello"', '')).toBe('hello');
      expect(parseJSON('42', 0)).toBe(42);
      expect(parseJSON('true', false)).toBe(true);
    });

    it('should return fallback for invalid JSON', () => {
      expect(parseJSON('invalid', {})).toEqual({});
      expect(parseJSON('{a: 1}', null)).toBe(null);
      expect(parseJSON('undefined', 'fallback')).toBe('fallback');
    });
  });
}); 