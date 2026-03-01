import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SubtitlePage from './SubtitlePage';

// Mock the Header and Footer components
vi.mock('../components/Header', () => ({
  default: () => <header>Header</header>
}));

vi.mock('../components/Footer', () => ({
  default: () => <footer>Footer</footer>
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <SubtitlePage />
    </BrowserRouter>
  );
};

describe('SubtitlePage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component', () => {
      renderComponent();
      
      expect(screen.getByText(/Subtitle Editor/i)).toBeInTheDocument();
      expect(screen.getByText(/Create and edit subtitles for your videos/i)).toBeInTheDocument();
    });

    it('should display the header component', () => {
      renderComponent();
      
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('should show video upload section initially', () => {
      renderComponent();
      
      expect(screen.getByText(/Select Video File/i)).toBeInTheDocument();
      expect(screen.getByText(/Supported formats: MP4, WebM, MOV/i)).toBeInTheDocument();
    });
  });

  describe('Video Upload', () => {
    it('should have a file input for video upload', () => {
      renderComponent();
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'video/*');
    });

    it('should trigger file input when button is clicked', async () => {
      renderComponent();
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      const uploadButton = screen.getByText(/Select Video File/i);
      await user.click(uploadButton);
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Page Layout', () => {
    it('should have gradient background', () => {
      renderComponent();
      
      const pageContainer = document.querySelector('.min-h-screen');
      expect(pageContainer?.className).toContain('bg-gray-950');
    });

    it('should have proper container structure', () => {
      renderComponent();
      
      const container = document.querySelector('.max-w-6xl');
      expect(container).toBeInTheDocument();
      expect(container?.className).toContain('flex-1');
      expect(container?.className).toContain('w-full');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive padding', () => {
      renderComponent();
      
      const mainElement = screen.getByRole('main');
      expect(mainElement?.className).toContain('px-6');
      expect(mainElement?.className).toContain('md:px-10');
      expect(mainElement?.className).toContain('lg:px-20');
      expect(mainElement?.className).toContain('xl:px-40');
    });

    it('should have responsive spacing', () => {
      renderComponent();
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent?.className).toContain('py-8');
    });
  });

  describe('Header Section', () => {
    it('should have proper heading hierarchy', () => {
      renderComponent();
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Subtitle Editor');
    });

    it('should have descriptive text', () => {
      renderComponent();
      
      expect(screen.getByText(/Create and edit subtitles for your videos/i)).toBeInTheDocument();
    });
  });
}); 