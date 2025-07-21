import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DepthMapPage from './DepthMapPage';

// Mock transformers.js
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    dispose: vi.fn()
  }),
  env: {
    allowLocalModels: false,
    backends: {
      onnx: {
        wasm: {
          proxy: false
        }
      }
    }
  }
}));

// Mock Header and Footer
vi.mock('../components/Header', () => ({
  default: () => <header>Header</header>
}));

vi.mock('../components/Footer', () => ({
  default: () => <footer>Footer</footer>
}));

vi.mock('../components/AnimatedPage', () => ({
  default: ({ children }: any) => <div>{children}</div>
}));

// Mock motion from framer-motion to avoid animation delays
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const filteredProps = Object.keys(props)
        .filter(key => !['whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition'].includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: props[key] }), {});
      return <div {...filteredProps}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const filteredProps = Object.keys(props)
        .filter(key => !['whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition'].includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: props[key] }), {});
      return <button {...filteredProps}>{children}</button>;
    },
  }
}));

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload({ target: { result: 'data:image/png;base64,mockdata' } });
    }, 0);
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock URL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Canvas
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  const blob = new Blob(['mock-image-data'], { type: 'image/png' });
  callback(blob);
});

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 100, height: 100 })
});

// Mock Image
global.Image = vi.fn().mockImplementation(() => {
  const img = {
    onload: null as any,
    src: '',
    width: 100,
    height: 100
  };
  
  Object.defineProperty(img, 'src', {
    set(value: string) {
      setTimeout(() => {
        if (img.onload) {
          img.onload();
        }
      }, 0);
    }
  });
  
  return img;
}) as any;

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  listeners: { [key: string]: Function[] } = { message: [] };
  
  constructor() {
    // Simulate model ready after initialization
    setTimeout(() => {
      this.sendMessage({ status: 'model_ready', message: 'Model loaded' });
    }, 0);
  }
  
  sendMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
    this.listeners.message?.forEach(listener => {
      listener(new MessageEvent('message', { data }));
    });
  }
  
  postMessage(data: any) {
    if (data.command === 'generate') {
      // Simulate processing
      setTimeout(() => {
        this.sendMessage({ status: 'processing', message: 'Processing image...' });
      }, 10);
      
      // Simulate completion
      setTimeout(() => {
        const output = new Uint8Array([137, 80, 78, 71]); // PNG header
        this.sendMessage({ 
          status: 'complete',
          output: output,
          width: 100,
          height: 100
        });
      }, 50);
    }
  }
  
  addEventListener(event: string, listener: any) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }
  
  removeEventListener(event: string, listener: any) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }
  
  terminate() {}
}

vi.stubGlobal('Worker', vi.fn().mockImplementation(() => new MockWorker()));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <DepthMapPage />
    </BrowserRouter>
  );
};

describe('DepthMapPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup({ delay: null });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('should render the main component', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/Upload a file/i)).toBeInTheDocument();
        expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
      });
    });

    it('should display file upload area', async () => {
      renderComponent();
      
      await waitFor(() => {
        const fileInput = screen.getByLabelText(/Upload a file/i);
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute('accept', 'image/*');
      });
    });
  });

  describe('Image Upload', () => {
    it('should handle file selection', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();
      });
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Upload a file/i);
      
      await act(async () => {
        await user.upload(fileInput, file);
      });
      
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
      });
    });

    it('should handle drag and drop', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload image by clicking or dragging/i })).toBeInTheDocument();
      });
      
      const dropZone = screen.getByRole('button', { name: /Upload image by clicking or dragging/i });
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      
      await act(async () => {
        fireEvent.dragEnter(dropZone);
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file],
          },
        });
      });
      
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
      });
    });
  });

  describe('Depth Map Generation', () => {
    it('should show generate button after image upload', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();
      });
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Upload a file/i);
      
      await act(async () => {
        await user.upload(fileInput, file);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Generate Depth Map/i)).toBeInTheDocument();
      });
    });

    it('should generate depth map when button is clicked', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();
      });
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Upload a file/i);
      
      await act(async () => {
        await user.upload(fileInput, file);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Generate Depth Map/i)).toBeInTheDocument();
      });
      
      const generateButton = screen.getByRole('button', { name: /Generate Depth Map/i });
      
      await act(async () => {
        await user.click(generateButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Depth Map Generated/i)).toBeInTheDocument();
      }, { timeout: 3000 });
      
      await waitFor(() => {
        expect(screen.getByAltText('Generated depth map')).toBeInTheDocument();
      });
    }, 10000);
  });

  describe('Results Display', () => {
    it('should display both original and depth map images', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();
      });
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Upload a file/i);
      
      await act(async () => {
        await user.upload(fileInput, file);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Generate Depth Map/i)).toBeInTheDocument();
      });
      
      const generateButton = screen.getByRole('button', { name: /Generate Depth Map/i });
      
      await act(async () => {
        await user.click(generateButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Original Image/i)).toBeInTheDocument();
        expect(screen.getByText(/Generated Depth Map/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }, 10000);

    it('should show download button for depth map', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();
      });
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Upload a file/i);
      
      await act(async () => {
        await user.upload(fileInput, file);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Generate Depth Map/i)).toBeInTheDocument();
      });
      
      const generateButton = screen.getByRole('button', { name: /Generate Depth Map/i });
      
      await act(async () => {
        await user.click(generateButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Download Depth Map/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }, 10000);
  });
}); 