"""
Core Image Comparison Module for VisualTestify Calypso
Implements SSIM, pixel difference, and annotation functionality
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from skimage.metrics import structural_similarity as ssim
from scipy.spatial.distance import cosine
import matplotlib.pyplot as plt
import json
from typing import Dict, Tuple, List, Any
import os

class ImageComparisonEngine:
    """Core engine for comparing UI screenshots"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'ssim_window_size': 11,
            'pixel_diff_threshold': 10,
            'annotation_color': (255, 0, 0),  # Red for differences
            'annotation_thickness': 2,
            'min_contour_area': 100,  # Minimum area for detecting changes
            'cosine_similarity_threshold': 0.95
        }
        
    def compare_images(self, image1_path: str, image2_path: str, output_dir: str = 'results') -> Dict[str, Any]:
        """
        Main comparison function that runs all comparison algorithms
        
        Args:
            image1_path: Path to baseline image
            image2_path: Path to comparison image
            output_dir: Directory to save results
            
        Returns:
            Dictionary containing all comparison metrics and output paths
        """
        # Load images
        img1 = cv2.imread(image1_path)
        img2 = cv2.imread(image2_path)
        
        # Ensure images are same size
        img1, img2 = self._resize_to_same_size(img1, img2)
        
        # Convert to grayscale for SSIM
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        
        # Calculate metrics
        results = {
            'ssim_score': self._calculate_ssim(gray1, gray2),
            'pixel_diff': self._calculate_pixel_difference(img1, img2),
            'cosine_similarity': self._calculate_cosine_similarity(img1, img2),
            'difference_regions': self._find_difference_regions(img1, img2),
            'metrics': {}
        }
        
        # Generate annotated images
        annotated_img = self._create_annotated_diff(img1, img2, results['difference_regions'])
        heatmap = self._create_heatmap(img1, img2)
        overlay = self._create_overlay(img1, img2)
        
        # Save outputs
        os.makedirs(output_dir, exist_ok=True)
        
        # Save annotated image
        annotated_path = os.path.join(output_dir, 'annotated_diff.png')
        cv2.imwrite(annotated_path, annotated_img)
        results['annotated_image'] = annotated_path
        
        # Save heatmap
        heatmap_path = os.path.join(output_dir, 'heatmap.png')
        cv2.imwrite(heatmap_path, heatmap)
        results['heatmap'] = heatmap_path
        
        # Save overlay
        overlay_path = os.path.join(output_dir, 'overlay.png')
        cv2.imwrite(overlay_path, overlay)
        results['overlay'] = overlay_path
        
        # Calculate composite score
        results['composite_score'] = self._calculate_composite_score(results)
        
        # Save metrics to JSON
        metrics_path = os.path.join(output_dir, 'metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        return results
    
    def _resize_to_same_size(self, img1: np.ndarray, img2: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Resize images to same size if needed"""
        if img1.shape != img2.shape:
            # Use the smaller dimensions
            height = min(img1.shape[0], img2.shape[0])
            width = min(img1.shape[1], img2.shape[1])
            img1 = cv2.resize(img1, (width, height))
            img2 = cv2.resize(img2, (width, height))
        return img1, img2
    
    def _calculate_ssim(self, gray1: np.ndarray, gray2: np.ndarray) -> Dict[str, float]:
        """Calculate Structural Similarity Index (SSIM)"""
        score, diff = ssim(gray1, gray2, full=True, win_size=self.config['ssim_window_size'])
        
        # Convert diff to 8-bit image
        diff = (diff * 255).astype("uint8")
        
        return {
            'score': float(score),
            'mean_diff': float(np.mean(diff)),
            'max_diff': float(np.max(diff)),
            'min_diff': float(np.min(diff))
        }
    
    def _calculate_pixel_difference(self, img1: np.ndarray, img2: np.ndarray) -> Dict[str, Any]:
        """Calculate pixel-wise differences"""
        # Calculate absolute difference
        diff = cv2.absdiff(img1, img2)
        
        # Convert to grayscale for analysis
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Count pixels above threshold
        threshold = self.config['pixel_diff_threshold']
        _, thresh = cv2.threshold(gray_diff, threshold, 255, cv2.THRESH_BINARY)
        
        total_pixels = img1.shape[0] * img1.shape[1]
        diff_pixels = cv2.countNonZero(thresh)
        
        return {
            'total_pixels': total_pixels,
            'different_pixels': diff_pixels,
            'percentage': (diff_pixels / total_pixels) * 100,
            'mean_difference': float(np.mean(gray_diff)),
            'max_difference': float(np.max(gray_diff))
        }
    
    def _calculate_cosine_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Calculate cosine similarity between image feature vectors"""
        # Flatten images to vectors
        vec1 = img1.flatten()
        vec2 = img2.flatten()
        
        # Normalize vectors
        vec1 = vec1 / np.linalg.norm(vec1)
        vec2 = vec2 / np.linalg.norm(vec2)
        
        # Calculate cosine similarity
        similarity = 1 - cosine(vec1, vec2)
        
        return float(similarity)
    
    def _find_difference_regions(self, img1: np.ndarray, img2: np.ndarray) -> List[Dict[str, Any]]:
        """Find regions with significant differences"""
        # Calculate difference
        diff = cv2.absdiff(img1, img2)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Threshold
        _, thresh = cv2.threshold(gray_diff, self.config['pixel_diff_threshold'], 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area >= self.config['min_contour_area']:
                x, y, w, h = cv2.boundingRect(contour)
                regions.append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'area': int(area),
                    'center': {
                        'x': int(x + w/2),
                        'y': int(y + h/2)
                    }
                })
        
        # Sort by area (largest first)
        regions.sort(key=lambda r: r['area'], reverse=True)
        
        return regions
    
    def _create_annotated_diff(self, img1: np.ndarray, img2: np.ndarray, regions: List[Dict]) -> np.ndarray:
        """Create annotated image showing differences"""
        # Create a copy of img2 for annotation
        annotated = img2.copy()
        
        # Draw rectangles around difference regions
        for i, region in enumerate(regions):
            x, y, w, h = region['x'], region['y'], region['width'], region['height']
            
            # Draw rectangle
            cv2.rectangle(annotated, (x, y), (x + w, y + h), 
                         self.config['annotation_color'], 
                         self.config['annotation_thickness'])
            
            # Add label with region number
            label = f"#{i+1}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            thickness = 1
            
            # Get text size
            (text_width, text_height), _ = cv2.getTextSize(label, font, font_scale, thickness)
            
            # Draw label background
            cv2.rectangle(annotated, 
                         (x, y - text_height - 4),
                         (x + text_width + 4, y),
                         self.config['annotation_color'], -1)
            
            # Draw label text
            cv2.putText(annotated, label, (x + 2, y - 2), 
                       font, font_scale, (255, 255, 255), thickness)
        
        return annotated
    
    def _create_heatmap(self, img1: np.ndarray, img2: np.ndarray) -> np.ndarray:
        """Create a heatmap showing intensity of differences"""
        # Calculate difference
        diff = cv2.absdiff(img1, img2)
        
        # Convert to grayscale
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur for smoothing
        blurred = cv2.GaussianBlur(gray_diff, (21, 21), 0)
        
        # Create heatmap using colormap
        heatmap = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)
        
        # Blend with original image
        result = cv2.addWeighted(img2, 0.7, heatmap, 0.3, 0)
        
        return result
    
    def _create_overlay(self, img1: np.ndarray, img2: np.ndarray) -> np.ndarray:
        """Create an overlay showing added/removed elements"""
        # Create colored versions
        img1_colored = img1.copy()
        img2_colored = img2.copy()
        
        # Make img1 more red (removed elements)
        img1_colored[:, :, 2] = np.minimum(img1_colored[:, :, 2] + 100, 255)
        
        # Make img2 more green (added elements)
        img2_colored[:, :, 1] = np.minimum(img2_colored[:, :, 1] + 100, 255)
        
        # Blend images
        overlay = cv2.addWeighted(img1_colored, 0.5, img2_colored, 0.5, 0)
        
        return overlay
    
    def _calculate_composite_score(self, results: Dict[str, Any]) -> float:
        """Calculate a composite similarity score (0-100)"""
        # Weight different metrics
        ssim_weight = 0.4
        pixel_weight = 0.3
        cosine_weight = 0.3
        
        # Normalize scores to 0-100
        ssim_score = results['ssim_score']['score'] * 100
        pixel_score = 100 - results['pixel_diff']['percentage']
        cosine_score = results['cosine_similarity'] * 100
        
        # Calculate weighted average
        composite = (
            ssim_score * ssim_weight +
            pixel_score * pixel_weight +
            cosine_score * cosine_weight
        )
        
        return float(composite)
    
    def generate_diff_gif(self, img1_path: str, img2_path: str, output_path: str):
        """Generate an animated GIF showing the difference"""
        img1 = Image.open(img1_path)
        img2 = Image.open(img2_path)
        
        # Ensure same size
        if img1.size != img2.size:
            img2 = img2.resize(img1.size)
        
        # Create frames
        frames = [img1, img2]
        
        # Save as GIF
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=500,  # 500ms per frame
            loop=0
        ) 