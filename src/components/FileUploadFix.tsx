import { useEffect } from 'react';

const FileUploadFix = () => {
  useEffect(() => {
    // Fix for file inputs not working properly
    const fixFileInputs = () => {
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => {
        const fileInput = input as HTMLInputElement;
        
        // Remove sr-only class if present
        fileInput.classList.remove('sr-only');
        
        // Ensure proper styling
        if (!fileInput.style.position || fileInput.style.position === 'absolute') {
          fileInput.style.position = 'absolute';
          fileInput.style.opacity = '0';
          fileInput.style.width = '100%';
          fileInput.style.height = '100%';
          fileInput.style.cursor = 'pointer';
          fileInput.style.zIndex = '1';
        }
        
        // Ensure parent is positioned
        const parent = fileInput.parentElement;
        if (parent && getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }
      });
    };

    // Run fix immediately
    fixFileInputs();

    // Run fix after any DOM changes
    const observer = new MutationObserver(fixFileInputs);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
};

export default FileUploadFix; 