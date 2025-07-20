import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ImageComparisonPage from './ImageComparisonPage';

// Mock the comparison worker
vi.mock('../workers/comparison.worker?worker', () => ({
  default: vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}));

// Mock pixelmatch
vi.mock('pixelmatch', () => ({
  default: vi.fn().mockReturnValue(100) // Return number of different pixels
}));

// Mock ssim.js
vi.mock('ssim.js', () => ({
  default: vi.fn().mockReturnValue({ mssim: 0.95, performance: 100 })
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ImageComparisonPage />
    </BrowserRouter>
  );
};

describe('ImageComparisonPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main comparison interface', () => {
      renderComponent();
      
      expect(screen.getByText(/Image Comparison Tool/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload Original Image/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload Modified Image/i)).toBeInTheDocument();
    });

    it('should display all comparison methods', () => {
      renderComponent();
      
      const methods = ['Pixel Difference', 'SSIM', 'Side by Side', 'Overlay'];
      methods.forEach(method => {
        expect(screen.getByText(method)).toBeInTheDocument();
      });
    });
  });

  describe('Image Upload', () => {
    it('should handle original image upload', async () => {
      renderComponent();
      
      const file = new File(['image'], 'original.png', { type: 'image/png' });
      const input = screen.getAllByLabelText(/upload.*image/i)[0];
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('original.png')).toBeInTheDocument();
      });
    });

    it('should handle modified image upload', async () => {
      renderComponent();
      
      const file = new File(['image'], 'modified.png', { type: 'image/png' });
      const inputs = screen.getAllByLabelText(/upload.*image/i);
      const modifiedInput = inputs[1];
      
      await user.upload(modifiedInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('modified.png')).toBeInTheDocument();
      });
    });

    it('should validate image file types', async () => {
      renderComponent();
      
      const invalidFile = new File(['text'], 'document.txt', { type: 'text/plain' });
      const input = screen.getAllByLabelText(/upload.*image/i)[0];
      
      await user.upload(input, invalidFile);
      
      // Should not accept non-image files
      expect(screen.queryByText('document.txt')).not.toBeInTheDocument();
    });

    it('should clear images when remove button is clicked', async () => {
      renderComponent();
      
      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getAllByLabelText(/upload.*image/i)[0];
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);
      
      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
    });
  });

  describe('Comparison Methods', () => {
    beforeEach(async () => {
      renderComponent();
      
      // Upload both images first
      const original = new File(['original'], 'original.png', { type: 'image/png' });
      const modified = new File(['modified'], 'modified.png', { type: 'image/png' });
      
      const inputs = screen.getAllByLabelText(/upload.*image/i);
      await user.upload(inputs[0], original);
      await user.upload(inputs[1], modified);
    });

    it('should perform pixel difference comparison', async () => {
      const pixelDiffButton = screen.getByText('Pixel Difference');
      await user.click(pixelDiffButton);
      
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Difference:/i)).toBeInTheDocument();
        expect(screen.getByText(/pixels/i)).toBeInTheDocument();
      });
    });

    it('should perform SSIM comparison', async () => {
      const ssimButton = screen.getByText('SSIM');
      await user.click(ssimButton);
      
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/SSIM Score:/i)).toBeInTheDocument();
        expect(screen.getByText(/0.95/)).toBeInTheDocument();
      });
    });

    it('should show side by side view', async () => {
      const sideBySideButton = screen.getByText('Side by Side');
      await user.click(sideBySideButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Original/i)).toBeInTheDocument();
        expect(screen.getByText(/Modified/i)).toBeInTheDocument();
      });
    });

    it('should show overlay view with opacity slider', async () => {
      const overlayButton = screen.getByText('Overlay');
      await user.click(overlayButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Opacity/i)).toBeInTheDocument();
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
    });
  });

  describe('Comparison Settings', () => {
    it('should adjust difference threshold', async () => {
      renderComponent();
      
      const thresholdSlider = screen.getByLabelText(/Threshold/i);
      expect(thresholdSlider).toHaveAttribute('value', '0');
      
      await user.type(thresholdSlider, '{arrowright}');
      
      expect(parseInt(thresholdSlider.getAttribute('value') || '0')).toBeGreaterThan(0);
    });

    it('should toggle highlight differences option', async () => {
      renderComponent();
      
      const highlightCheckbox = screen.getByLabelText(/Highlight Differences/i);
      expect(highlightCheckbox).not.toBeChecked();
      
      await user.click(highlightCheckbox);
      
      expect(highlightCheckbox).toBeChecked();
    });

    it('should change difference color', async () => {
      renderComponent();
      
      const colorPicker = screen.getByLabelText(/Difference Color/i);
      await user.click(colorPicker);
      
      // Color picker should be interactable
      expect(colorPicker).toHaveAttribute('type', 'color');
    });
  });

  describe('Results Display', () => {
    beforeEach(async () => {
      renderComponent();
      
      const original = new File(['original'], 'original.png', { type: 'image/png' });
      const modified = new File(['modified'], 'modified.png', { type: 'image/png' });
      
      const inputs = screen.getAllByLabelText(/upload.*image/i);
      await user.upload(inputs[0], original);
      await user.upload(inputs[1], modified);
    });

    it('should display comparison statistics', async () => {
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Pixels:/i)).toBeInTheDocument();
        expect(screen.getByText(/Different Pixels:/i)).toBeInTheDocument();
        expect(screen.getByText(/Similarity:/i)).toBeInTheDocument();
      });
    });

    it('should show processing time', async () => {
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Processing Time:/i)).toBeInTheDocument();
        expect(screen.getByText(/ms/i)).toBeInTheDocument();
      });
    });

    it('should allow downloading comparison result', async () => {
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        expect(downloadButton).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when comparing without images', async () => {
      renderComponent();
      
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please upload both images/i)).toBeInTheDocument();
      });
    });

    it('should handle comparison worker errors', async () => {
      const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Comparison failed')), 0);
          }
        }),
        removeEventListener: vi.fn(),
      };
      
      vi.mocked(Worker).mockImplementation(() => mockWorker as any);
      
      renderComponent();
      
      const original = new File(['original'], 'original.png', { type: 'image/png' });
      const modified = new File(['modified'], 'modified.png', { type: 'image/png' });
      
      const inputs = screen.getAllByLabelText(/upload.*image/i);
      await user.upload(inputs[0], original);
      await user.upload(inputs[1], modified);
      
      const compareButton = screen.getByRole('button', { name: /compare/i });
      await user.click(compareButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Zoom and Pan', () => {
    it('should zoom in on comparison result', async () => {
      renderComponent();
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);
      
      // Check if zoom level increased
      expect(screen.getByText(/125%/i)).toBeInTheDocument();
    });

    it('should zoom out on comparison result', async () => {
      renderComponent();
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      await user.click(zoomOutButton);
      
      // Check if zoom level decreased
      expect(screen.getByText(/75%/i)).toBeInTheDocument();
    });

    it('should reset zoom to 100%', async () => {
      renderComponent();
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      
      const resetButton = screen.getByRole('button', { name: /reset zoom/i });
      await user.click(resetButton);
      
      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });
  });
}); 