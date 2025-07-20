import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ASCIIVideoConverter from './ASCIIVideoConverter';

// Mock the worker
vi.mock('../workers/asciiProcessor.worker?worker', () => ({
  default: vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}));

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

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ASCIIVideoConverter />
    </BrowserRouter>
  );
};

describe('ASCIIVideoConverter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component with all sections', () => {
      renderComponent();
      
      expect(screen.getByText(/ASCII Video Converter/i)).toBeInTheDocument();
      expect(screen.getByText(/Drop files here or click to browse/i)).toBeInTheDocument();
      expect(screen.getByText(/Configuration/i)).toBeInTheDocument();
    });

    it('should display all preset buttons', () => {
      renderComponent();
      
      const presetButtons = ['Classic', 'Matrix', 'Minimal', 'Complex', 'Binary'];
      presetButtons.forEach(preset => {
        expect(screen.getByText(preset)).toBeInTheDocument();
      });
    });

    it('should show all color mode options', () => {
      renderComponent();
      
      const colorModes = ['Mono', 'Matrix', 'Cyberpunk', 'Retro', 'Neon', 'Vaporwave'];
      colorModes.forEach(mode => {
        expect(screen.getByText(mode)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('should accept video file upload', async () => {
      renderComponent();
      
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
    });

    it('should accept image file upload', async () => {
      renderComponent();
      
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });

    it('should handle multiple file uploads', async () => {
      renderComponent();
      
      const files = [
        new File(['image1'], 'test1.png', { type: 'image/png' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, files);
      
      await waitFor(() => {
        expect(screen.getByText('test1.png')).toBeInTheDocument();
        expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      });
    });

    it('should remove file when X button is clicked', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
    });
  });

  describe('Configuration Controls', () => {
    it('should update brightness slider', async () => {
      renderComponent();
      
      const brightnessSlider = screen.getByLabelText(/Brightness/i);
      expect(brightnessSlider).toHaveAttribute('value', '1');
      
      fireEvent.change(brightnessSlider, { target: { value: '1.5' } });
      expect(brightnessSlider).toHaveAttribute('value', '1.5');
    });

    it('should update contrast slider', async () => {
      renderComponent();
      
      const contrastSlider = screen.getByLabelText(/Contrast/i);
      expect(contrastSlider).toHaveAttribute('value', '1');
      
      fireEvent.change(contrastSlider, { target: { value: '1.8' } });
      expect(contrastSlider).toHaveAttribute('value', '1.8');
    });

    it('should change ASCII preset', async () => {
      renderComponent();
      
      const matrixButton = screen.getByText('Matrix');
      await user.click(matrixButton);
      
      // Check if the button is selected (has different styling)
      expect(matrixButton).toHaveClass('bg-gradient-to-r');
    });

    it('should change color mode', async () => {
      renderComponent();
      
      const cyberpunkButton = screen.getByText('Cyberpunk');
      await user.click(cyberpunkButton);
      
      expect(cyberpunkButton).toHaveClass('from-purple-500');
    });

    it('should update quality setting', async () => {
      renderComponent();
      
      const qualityButtons = screen.getAllByRole('button').filter(btn => 
        ['Low', 'Medium', 'High', 'Ultra'].includes(btn.textContent || '')
      );
      
      const highQualityButton = qualityButtons.find(btn => btn.textContent === 'High');
      if (highQualityButton) {
        await user.click(highQualityButton);
        expect(highQualityButton).toHaveClass('bg-gradient-to-r');
      }
    });

    it('should update frame rate', async () => {
      renderComponent();
      
      const frameRateSlider = screen.getByLabelText(/Frame Rate/i);
      fireEvent.change(frameRateSlider, { target: { value: '24' } });
      
      expect(screen.getByText('24 FPS')).toBeInTheDocument();
    });

    it('should toggle advanced settings', async () => {
      renderComponent();
      
      const advancedButton = screen.getByText(/Advanced Settings/i);
      await user.click(advancedButton);
      
      // Check if advanced settings are visible
      expect(screen.getByLabelText(/Worker Count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Batch Size/i)).toBeInTheDocument();
    });
  });

  describe('Processing Flow', () => {
    it('should start processing when process button is clicked', async () => {
      renderComponent();
      
      // Upload a file first
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
      
      // Click process button
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      // Check if processing indicator appears
      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      });
    });

    it('should show progress during processing', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should allow pausing and resuming processing', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      // Wait for pause button to appear
      await waitFor(() => {
        const pauseButton = screen.getByRole('button', { name: /Pause/i });
        expect(pauseButton).toBeInTheDocument();
      });
      
      // Click pause
      const pauseButton = screen.getByRole('button', { name: /Pause/i });
      await user.click(pauseButton);
      
      // Check if resume button appears
      expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
    });

    it('should display performance metrics during processing', async () => {
      renderComponent();
      
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText(/FPS/i)).toBeInTheDocument();
        expect(screen.getByText(/CPU Usage/i)).toBeInTheDocument();
        expect(screen.getByText(/Memory/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should show export options after processing', async () => {
      renderComponent();
      
      // Simulate completed processing
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      // Mock processing completion
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      // Simulate processing completion
      await waitFor(() => {
        expect(screen.getByText(/Export as GIF/i)).toBeInTheDocument();
        expect(screen.getByText(/Export as Video/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle worker errors gracefully', async () => {
      // Mock worker error
      const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Worker error')), 0);
          }
        }),
        removeEventListener: vi.fn(),
      };
      
      vi.mocked(Worker).mockImplementation(() => mockWorker as any);
      
      renderComponent();
      
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      await user.upload(input, file);
      
      const processButton = screen.getByRole('button', { name: /Process Files/i });
      await user.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Error processing/i)).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      renderComponent();
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/Drop files here or click to browse/i);
      
      await user.upload(input, invalidFile);
      
      // File should not be accepted
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });
      
      renderComponent();
      
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
}); 