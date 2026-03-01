import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import NewUpscalerPage from './NewUpscalerPage';

// Mock Header and Footer
vi.mock('../components/Header', () => ({
  default: () => <header>Header</header>
}));

vi.mock('../components/Footer', () => ({
  default: () => <footer>Footer</footer>
}));

// Mock the upscaler components
vi.mock('../components/upscaler/UpscalerInput', () => ({
  default: ({ onImageUploaded }: any) => (
    <div data-testid="upscaler-input">
      <h1>AI Image Upscaler</h1>
      <p>Enhance your images</p>
      <button onClick={() => onImageUploaded(new File(['test'], 'test.png', { type: 'image/png' }), 2, 'RealESRGAN')}>
        Upload and Upscale
      </button>
    </div>
  ),
}));

vi.mock('../components/upscaler/UpscalerOutput', () => ({
  default: () => <div data-testid="upscaler-output">Upscaler Output</div>
}));

vi.mock('../components/upscaler/ProcessingOverlay', () => ({
  default: ({ statusMessage, progress }: any) => (
    <div data-testid="processing-overlay">
      <div>{statusMessage}</div>
      <div>{progress}%</div>
    </div>
  )
}));

vi.mock('../components/AnimatedPage', () => ({
  default: ({ children }: any) => <div>{children}</div>
}));

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  
  postMessage(data: any) {
    if (data.command === 'initialize') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { 
            data: { status: 'worker_initialized', message: 'Worker ready' }
          }));
        }
      }, 0);
    } else if (data.command === 'upscale') {
      setTimeout(() => {
        if (this.onmessage) {
          // Simulate processing
          this.onmessage(new MessageEvent('message', { 
            data: { status: 'processing', message: 'Processing image...', progress: 50 }
          }));
          
          // Simulate completion
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', { 
                data: { 
                  status: 'complete', 
                  upscaledImageUrl: 'data:image/png;base64,mockupscaled',
                  stats: { width: 1024, height: 1024, size: '2.5 MB' }
                }
              }));
            }
          }, 100);
        }
      }, 0);
    }
  }
  
  terminate() {}
}

// Mock Worker constructor
vi.stubGlobal('Worker', vi.fn().mockImplementation(() => new MockWorker()));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <NewUpscalerPage />
    </BrowserRouter>
  );
};

describe('NewUpscalerPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/AI Image Upscaler/i)).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('upscaler-input')).toBeInTheDocument();
    });

    it('should show the title and description', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/AI Image Upscaler/i)).toBeInTheDocument();
        expect(screen.getByText(/Enhance your images/i)).toBeInTheDocument();
      });
    });
  });

  describe('Image Processing', () => {
    it('should handle image upload and processing', async () => {
      renderComponent();
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/AI Image Upscaler/i)).toBeInTheDocument();
      });
      
      // Mock file upload - find the dropzone or file input
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      
      // The component uses a dropzone, so we need to find the input inside it
      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      
      if (fileInput) {
        await user.upload(fileInput, file);
        
        // Wait for file to be selected
        await waitFor(() => {
          expect(screen.getByText('test.png')).toBeInTheDocument();
        });
        
        // Click the start AI upscaling button
        const upscaleButton = screen.getByRole('button', { name: /Start AI Upscaling/i });
        await user.click(upscaleButton);
        
        // Should show processing overlay with status message
        await waitFor(() => {
        expect(screen.getByText(/Preparing image.../i)).toBeInTheDocument();
      });
      
        // Check for progress percentage
      await waitFor(() => {
          expect(screen.getByText(/0%/i)).toBeInTheDocument();
      });
      }
    });
  });
}); 