import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SplatViewerPage from './SplatViewerPage';

// Mock Three.js and related components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="three-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {},
    scene: {},
    gl: {},
    size: { width: 800, height: 600 }
  }),
  useLoader: vi.fn(() => ({
    computeBoundingBox: vi.fn(),
    center: vi.fn(),
    computeVertexNormals: vi.fn(),
    attributes: { position: { count: 1000 } }
  }))
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Environment: () => <div data-testid="environment" />,
  Stats: () => <div data-testid="stats" />,
  Bounds: ({ children }: any) => <div>{children}</div>,
  Center: ({ children }: any) => <div>{children}</div>
}));

// Mock gsplat
vi.mock('gsplat', () => ({
  default: vi.fn()
}));

// Mock three PLYLoader
vi.mock('three/examples/jsm/loaders/PLYLoader.js', () => ({
  PLYLoader: class {
    load = vi.fn()
    parse = vi.fn()
  }
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsArrayBuffer: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload({ target: { result: new ArrayBuffer(100) } });
    }, 0);
  }),
  readAsText: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload({ target: { result: 'ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\n' } });
    }, 0);
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

// Mock Header and Footer
vi.mock('../components/Header', () => ({
  default: () => <header>Header</header>
}));

vi.mock('../components/Footer', () => ({
  default: () => <footer>Footer</footer>
}));

vi.mock('../components/CardGlass', () => ({
  default: ({ children, className }: any) => <div className={className}>{children}</div>
}));

vi.mock('../components/SplatViewerControls', () => ({
  default: () => <div data-testid="splat-viewer-controls">Controls</div>
}));

vi.mock('../components/HolographicStats', () => ({
  default: () => <div data-testid="holographic-stats">Stats</div>
}));

vi.mock('../viewers/ViewerSettingsContext', () => ({
  ViewerSettingsProvider: ({ children }: any) => <div>{children}</div>,
  useViewerSettings: () => ({
    settings: {
      quality: 'High',
      showStats: false,
      environmentPreset: 'studio',
      enableAnnotations: false,
      backgroundColor: '#000000'
    },
    updateSetting: vi.fn()
  })
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <SplatViewerPage />
    </BrowserRouter>
  );
};

describe('SplatViewerPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component', () => {
      renderComponent();
      
      expect(screen.getByText(/3D Splat Viewer/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
    });

    it('should show upload area when no model is loaded', () => {
      renderComponent();
      
      expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
      expect(screen.getByText(/Select from Computer/i)).toBeInTheDocument();
    });

    it('should display Luma AI toggle button', () => {
      renderComponent();
      
      expect(screen.getByText(/Load from Luma/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should handle file selection', async () => {
      renderComponent();
      
      const file = new File(['splat content'], 'test.ply', { type: 'application/ply' });
      const fileInput = screen.getByLabelText(/Select from Computer/i);
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
      });
    });

    it('should handle drag and drop', async () => {
      renderComponent();
      
      const file = new File(['splat content'], 'test.ply', { type: 'application/ply' });
      const dropZone = screen.getByText(/Drag & drop a file/i).closest('div');
      
      fireEvent.dragOver(dropZone!);
      expect(screen.getByText(/Release to upload!/i)).toBeInTheDocument();
      
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      renderComponent();
      
      // Wait for component to be ready
      await waitFor(() => {
        expect(screen.getByText(/3D Splat Viewer/i)).toBeInTheDocument();
      });
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.getElementById('splat-file-upload') as HTMLInputElement;
      
      // Create a change event manually to ensure it's triggered
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent(fileInput, event);
      
      // Should show error for invalid file type - wait a bit longer
      await waitFor(() => {
        const errorText = screen.getByText((content, element) => {
          return content.includes('Unsupported file type') || 
                 content.includes('Please upload a .ply or .tsf file');
      });
        expect(errorText).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Luma AI Integration', () => {
    it('should toggle Luma AI input', async () => {
      renderComponent();
      
      const lumaButton = screen.getByText(/Load from Luma/i);
      await user.click(lumaButton);
      
      expect(screen.getByText(/Load from Luma AI/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter Luma AI capture URL/i)).toBeInTheDocument();
    });

    it('should switch back to file upload', async () => {
      renderComponent();
      
      // Switch to Luma
      const lumaButton = screen.getByText(/Load from Luma/i);
      await user.click(lumaButton);
      
      // Switch back
      const fileButton = screen.getByText(/Upload File/i);
      await user.click(fileButton);
      
      expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
    });
  });

  describe('Viewer Controls', () => {
    it('should show controls component', () => {
      renderComponent();
      
      expect(screen.getByTestId('splat-viewer-controls')).toBeInTheDocument();
    });

    it('should have drag and drop area', () => {
      renderComponent();
      
      expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
    });

    it('should have file upload button', () => {
      renderComponent();
      
      const uploadButton = screen.getByLabelText(/Select from Computer/i);
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe('Example Models', () => {
    it('should have file upload functionality', async () => {
      renderComponent();
      
      const uploadLabel = screen.getByLabelText(/Select from Computer/i);
      expect(uploadLabel).toBeInTheDocument();
    });

    it('should show drag and drop area', () => {
      renderComponent();
      
      expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have a toggle button for Luma AI', () => {
      renderComponent();
      
      const toggleButton = screen.getByRole('button', { name: /Load from Luma/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle between upload and Luma input when button is clicked', async () => {
      renderComponent();
      
      const toggleButton = screen.getByRole('button', { name: /Load from Luma/i });
      await user.click(toggleButton);
      
      // After clicking, button should show "Upload File"
      expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      
      // Luma input should be visible
      expect(screen.getByPlaceholderText(/Enter Luma AI capture URL/i)).toBeInTheDocument();
    });
  });

  describe('3D Scene', () => {
    it('should render Canvas component after file upload', async () => {
      renderComponent();
      
      // Upload a file first
      const file = new File(['test content'], 'model.ply', { type: 'application/octet-stream' });
      const input = screen.getByLabelText(/Select from Computer/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Wait for Canvas to appear
      await waitFor(() => {
        const canvas = screen.getByTestId('three-canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should include orbit controls after file upload', async () => {
      renderComponent();
      
      // Upload a file first
      const file = new File(['test content'], 'model.ply', { type: 'application/octet-stream' });
      const input = screen.getByLabelText(/Select from Computer/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Wait for controls to appear
      await waitFor(() => {
        const controls = screen.getByTestId('orbit-controls');
        expect(controls).toBeInTheDocument();
      });
    });

    it('should include environment lighting after file upload', async () => {
      renderComponent();
      
      // Upload a file first
      const file = new File(['test content'], 'model.ply', { type: 'application/octet-stream' });
      const input = screen.getByLabelText(/Select from Computer/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Wait for environment to appear
      await waitFor(() => {
        const environment = screen.getByTestId('environment');
        expect(environment).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should display controls component', async () => {
      renderComponent();
      
      const controls = screen.getByTestId('splat-viewer-controls');
      expect(controls).toBeInTheDocument();
    });

    it('should display holographic stats component after file upload', async () => {
      renderComponent();
      
      const file = new File(['ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\n'], 'model.ply', { type: 'application/octet-stream' });
      const input = screen.getByLabelText(/Select from Computer/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Wait for stats to appear
      await waitFor(() => {
        const stats = screen.getByTestId('holographic-stats');
        expect(stats).toBeInTheDocument();
      });
    });

    it('should accept PLY file upload', async () => {
      renderComponent();
      
      const file = new File(['content'], 'model.ply', { type: 'application/octet-stream' });
      const input = screen.getByLabelText(/Select from Computer/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Wait for 3D scene to render
      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message for unsupported file types', async () => {
      renderComponent();
      
      // Wait for component to be ready
      await waitFor(() => {
        expect(screen.getByText(/3D Splat Viewer/i)).toBeInTheDocument();
      });
      
      const file = new File(['content'], 'model.txt', { type: 'text/plain' });
      const input = document.getElementById('splat-file-upload') as HTMLInputElement;
      
      // Trigger file change event
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent(input, event);
      
      // The error should be set synchronously, but rendering might be async
      await waitFor(() => {
        const errorElement = screen.getByText((content, element) => {
          return element?.tagName !== 'SCRIPT' && element?.tagName !== 'STYLE' &&
                 (content.includes('Unsupported file type') || 
                  content.includes('Please upload a .ply or .tsf file'));
      });
        expect(errorElement).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
}); 