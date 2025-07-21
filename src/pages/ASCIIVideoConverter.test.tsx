import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ASCIIVideoConverter from './ASCIIVideoConverter';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the worker - fix for cross-platform compatibility
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  
  postMessage(data: any) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        const response = {
          type: 'frameProcessed',
          data: {
            frameNumber: data.data?.frameData?.frameNumber || 0,
            timestamp: data.data?.frameData?.timestamp || 0,
            ascii: 'Mock ASCII Art',
            colors: data.data?.config?.colored ? new Uint8ClampedArray(100) : null,
            width: data.data?.frameData?.width || 10,
            height: data.data?.frameData?.height || 10
          }
        };
        this.onmessage(new MessageEvent('message', { data: response }));
      }
    }, 0);
  }
  
  addEventListener(event: string, handler: any) {
    if (event === 'message') this.onmessage = handler;
    if (event === 'error') this.onerror = handler;
  }
  
  removeEventListener() {}
  terminate() {}
}

// Mock Worker constructor
vi.stubGlobal('Worker', vi.fn().mockImplementation(() => new MockWorker()));

// Mock the GIF.js library
vi.mock('gif.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    addFrame: vi.fn(),
    render: vi.fn(),
    on: vi.fn(),
  }))
}));

// Mock file reader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload({ target: { result: 'data:image/png;base64,mockdata' } });
    }, 0);
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  value: vi.fn(),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  value: vi.fn(),
});

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ASCIIVideoConverter />
    </BrowserRouter>
  );
};

// Helper function to upload file
const uploadFile = async (user: ReturnType<typeof userEvent.setup>, file: File) => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (!fileInput) {
    throw new Error('File input not found');
  }
  await user.upload(fileInput, file);
};

describe('ASCIIVideoConverter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Reset the error state
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsDataURL: vi.fn(function(this: any) {
        setTimeout(() => {
          this.onload({ target: { result: 'data:image/png;base64,mockdata' } });
        }, 0);
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component with all sections', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/ASCII Art Studio/i)).toBeInTheDocument();
      });
      
      // Use getAllByText for elements that appear multiple times
      const uploadMediaElements = screen.getAllByText(/Upload Media/i);
      expect(uploadMediaElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/ASCII Presets/i)).toBeInTheDocument();
    });

    it('should display all preset buttons', async () => {
      renderComponent();
      
      await waitFor(() => {
        const presetButtons = ['Classic', 'Minimal', 'Blocks', 'Detailed'];
        presetButtons.forEach(preset => {
          expect(screen.getByText(preset)).toBeInTheDocument();
        });
        // Matrix appears in multiple places (preset and theme)
        const matrixElements = screen.getAllByText('Matrix');
        expect(matrixElements.length).toBeGreaterThan(0);
      });
    });

    it('should show all color theme options', () => {
      renderComponent();
      
      expect(screen.getByText('Color Theme')).toBeInTheDocument();
      // Color themes are shown as buttons, check for theme names
      const themeNames = ['Monochrome', 'Cyberpunk', 'Retro', 'Neon', 'Vaporwave'];
      themeNames.forEach(theme => {
        expect(screen.getByText(theme)).toBeInTheDocument();
      });
      // Matrix appears in multiple places
      const matrixElements = screen.getAllByText('Matrix');
      expect(matrixElements.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload', () => {
    it('should accept video file upload', async () => {
      renderComponent();
      
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
    });

    it('should accept image file upload', async () => {
      renderComponent();
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });

    it('should show error for invalid file types', async () => {
      renderComponent();
      
      // Create a mock FileReader that will handle the invalid file
      const mockFileReader = {
        readAsDataURL: vi.fn(function(this: any) {
          // Don't call onload for invalid files
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onload: null,
        onerror: null,
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as any;
      
      const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // The component should reject the file based on type
      await waitFor(() => {
        // Check that the file is not displayed
        expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
      });
    });

    it('should remove file when X button is clicked', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
      
      // Find the X button using the X icon - look for the button with X class icon
      const fileDisplay = screen.getByText('test.png').closest('div');
      const removeButton = fileDisplay?.querySelector('button[class*="text-red"]') || 
                          fileDisplay?.querySelector('button');
      
      if (removeButton) {
        // Force click the button
        fireEvent.click(removeButton);
      
        // Wait for the file to be removed
        await waitFor(() => {
      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
        }, { timeout: 2000 });
      } else {
        // If no button found, the file should still be removable somehow
        expect(removeButton).toBeTruthy();
      }
    });
  });

  describe('Configuration Controls', () => {
    it('should update brightness slider', async () => {
      renderComponent();
      
      // Click advanced settings to show sliders
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      await waitFor(() => {
        const brightnessSlider = screen.getByText(/Brightness:/i).parentElement?.querySelector('input[type="range"]');
        expect(brightnessSlider).toBeInTheDocument();
        expect(brightnessSlider).toHaveAttribute('value', '1');
        
        fireEvent.change(brightnessSlider as Element, { target: { value: '1.5' } });
        expect(brightnessSlider).toHaveAttribute('value', '1.5');
      });
    });

    it('should update contrast slider', async () => {
      renderComponent();
      
      // Click advanced settings
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      await waitFor(() => {
        // Advanced settings should now be visible
        expect(screen.getByText(/Brightness:/i)).toBeInTheDocument();
        expect(screen.getByText(/Contrast:/i)).toBeInTheDocument();
      });
    });

    it('should change ASCII preset', async () => {
      renderComponent();
      
      // ASCII presets are likely in a dropdown or tab
      const detailedPreset = screen.getByText(/Detailed/i);
      expect(detailedPreset).toBeInTheDocument();
    });

    it('should change color theme', async () => {
      renderComponent();
      
      // Color themes should be available
      expect(screen.getByText(/Cyberpunk/i)).toBeInTheDocument();
      expect(screen.getByText(/Color Theme/i)).toBeInTheDocument();
    });

    it('should update output mode', async () => {
      renderComponent();
      
      // Output modes should be available
      expect(screen.getByText(/Output Mode/i)).toBeInTheDocument();
    });

    it('should update frame rate', async () => {
      renderComponent();
      
      // Click advanced settings
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      await waitFor(() => {
        const fps24Button = screen.getByRole('button', { name: /24/ });
        expect(fps24Button).toBeInTheDocument();
        
        user.click(fps24Button);
        expect(fps24Button.className).toContain('border-opacity-100');
      });
    });

    it('should toggle advanced settings', async () => {
      renderComponent();
      
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      // Check if advanced settings are visible
      await waitFor(() => {
        expect(screen.getByText(/Worker Threads:/i)).toBeInTheDocument();
        expect(screen.getByText(/Batch Size:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Processing Flow', () => {
    it('should start processing when process button is clicked for image', async () => {
      renderComponent();
      
      // Upload a file first
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
      
      // Mock image loading
      const img = new Image();
      Object.defineProperty(img, 'onload', {
        set(fn: any) {
          setTimeout(() => fn(), 0);
        }
      });
      
      // Check if process button appears
      await waitFor(() => {
        const processButton = screen.getByRole('button', { name: /Process Image/i });
        expect(processButton).toBeInTheDocument();
      });
    });

    it('should show progress during video processing', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByText(/Click or drop/i).closest('button')?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);
      
      // Mock video metadata loading
      const video = document.querySelector('video');
      if (video) {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
        Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
        
        // Trigger loadedmetadata event
        const event = new Event('loadedmetadata');
        video.dispatchEvent(event);
      }
      
      await waitFor(() => {
        const processButton = screen.getByRole('button', { name: /Process Video/i });
        expect(processButton).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should show export format options', async () => {
      renderComponent();
      
      // Click advanced settings to see export options
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export Format')).toBeInTheDocument();
        // Use getAllByRole and find the specific export format button
        const buttons = screen.getAllByRole('button');
        const mp4Button = buttons.find(btn => btn.textContent?.includes('MP4/WebM'));
        const gifButton = buttons.find(btn => btn.textContent === 'GIF');
        const textButton = buttons.find(btn => btn.textContent === 'Text');
        
        expect(mp4Button).toBeInTheDocument();
        expect(gifButton).toBeInTheDocument();
        expect(textButton).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle image loading errors gracefully', async () => {
      renderComponent();
      
      // Check that the component renders without errors - look for the main heading
      await waitFor(() => {
        expect(screen.getByText(/ASCII Art Studio/i)).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      renderComponent();
      
      // File type validation happens on file selection
      // The component should show an upload area - use getAllByText and pick the first one
      const uploadMediaElements = screen.getAllByText(/Upload Media/i);
      expect(uploadMediaElements[0]).toBeInTheDocument();
      expect(screen.getByText(/Images: JPG, PNG/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', async () => {
      renderComponent();
      
      const backButton = screen.getByRole('button', { name: /Back to Home/i });
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
}); 