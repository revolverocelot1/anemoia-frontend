"""
OCR Text Verification Module for VisualTestify Calypso
Uses Tesseract OCR to extract and verify text content from UI screenshots
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
import difflib
from typing import Dict, List, Tuple, Any, Optional
import json
import re
from dataclasses import dataclass
import os

@dataclass
class TextRegion:
    """Represents a text region detected by OCR"""
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x, y, width, height
    line_number: int
    word_number: int

@dataclass
class TextMismatch:
    """Represents a mismatch between expected and actual text"""
    expected: str
    actual: str
    confidence: float
    location: Tuple[int, int, int, int]
    mismatch_type: str  # 'missing', 'different', 'truncated', 'alignment'

class OCRTextVerifier:
    """OCR-based text verification for UI testing"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'confidence_threshold': 70,  # Minimum OCR confidence
            'language': 'eng',  # Tesseract language
            'psm_mode': 11,  # Page segmentation mode
            'oem_mode': 3,   # OCR Engine mode
            'preprocessing': True,  # Apply image preprocessing
            'text_similarity_threshold': 0.85  # For fuzzy matching
        }
        
        # Configure Tesseract path if needed (Windows)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    def extract_text(self, image_path: str, preprocess: bool = True) -> List[TextRegion]:
        """
        Extract text from image using OCR
        
        Args:
            image_path: Path to the image file
            preprocess: Whether to apply preprocessing
            
        Returns:
            List of TextRegion objects
        """
        # Load image
        img = cv2.imread(image_path)
        
        if preprocess and self.config['preprocessing']:
            img = self._preprocess_image(img)
        
        # Get OCR data with bounding boxes
        ocr_data = pytesseract.image_to_data(
            img,
            lang=self.config['language'],
            config=f'--psm {self.config["psm_mode"]} --oem {self.config["oem_mode"]}',
            output_type=pytesseract.Output.DICT
        )
        
        # Parse OCR results
        text_regions = []
        n_boxes = len(ocr_data['level'])
        
        for i in range(n_boxes):
            # Filter out empty text and low confidence
            if ocr_data['text'][i].strip() and ocr_data['conf'][i] > self.config['confidence_threshold']:
                region = TextRegion(
                    text=ocr_data['text'][i],
                    confidence=ocr_data['conf'][i],
                    bbox=(
                        ocr_data['left'][i],
                        ocr_data['top'][i],
                        ocr_data['width'][i],
                        ocr_data['height'][i]
                    ),
                    line_number=ocr_data['line_num'][i],
                    word_number=ocr_data['word_num'][i]
                )
                text_regions.append(region)
        
        return text_regions
    
    def compare_text(self, image1_path: str, image2_path: str) -> Dict[str, Any]:
        """
        Compare text content between two images
        
        Args:
            image1_path: Path to baseline image
            image2_path: Path to comparison image
            
        Returns:
            Dictionary containing comparison results
        """
        # Extract text from both images
        text1_regions = self.extract_text(image1_path)
        text2_regions = self.extract_text(image2_path)
        
        # Get full text for overall comparison
        text1_full = ' '.join([r.text for r in text1_regions])
        text2_full = ' '.join([r.text for r in text2_regions])
        
        # Calculate text similarity
        similarity = difflib.SequenceMatcher(None, text1_full, text2_full).ratio()
        
        # Find mismatches
        mismatches = self._find_text_mismatches(text1_regions, text2_regions)
        
        # Detect truncated text
        truncated = self._detect_truncated_text(text2_regions)
        
        # Check text alignment
        alignment_issues = self._check_text_alignment(text1_regions, text2_regions)
        
        return {
            'text_similarity': similarity,
            'baseline_text': text1_full,
            'comparison_text': text2_full,
            'mismatches': mismatches,
            'truncated_text': truncated,
            'alignment_issues': alignment_issues,
            'baseline_word_count': len(text1_full.split()),
            'comparison_word_count': len(text2_full.split())
        }
    
    def verify_text_content(self, image_path: str, expected_text: List[str]) -> Dict[str, Any]:
        """
        Verify that specific text content appears in the image
        
        Args:
            image_path: Path to the image
            expected_text: List of expected text strings
            
        Returns:
            Verification results
        """
        # Extract text from image
        text_regions = self.extract_text(image_path)
        full_text = ' '.join([r.text for r in text_regions])
        
        results = {
            'found': [],
            'missing': [],
            'partial_matches': []
        }
        
        for expected in expected_text:
            # Exact match
            if expected in full_text:
                results['found'].append(expected)
            else:
                # Try fuzzy matching
                best_match, score = self._find_best_match(expected, text_regions)
                if score >= self.config['text_similarity_threshold']:
                    results['partial_matches'].append({
                        'expected': expected,
                        'found': best_match,
                        'similarity': score
                    })
                else:
                    results['missing'].append(expected)
        
        results['verification_score'] = len(results['found']) / len(expected_text) * 100
        
        return results
    
    def _preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Apply preprocessing to improve OCR accuracy"""
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Dilation and erosion to remove noise
        kernel = np.ones((1, 1), np.uint8)
        processed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return processed
    
    def _find_text_mismatches(self, regions1: List[TextRegion], regions2: List[TextRegion]) -> List[TextMismatch]:
        """Find mismatches between two sets of text regions"""
        mismatches = []
        
        # Create text maps for comparison
        text1_map = {r.text: r for r in regions1}
        text2_map = {r.text: r for r in regions2}
        
        # Find missing text
        for text, region in text1_map.items():
            if text not in text2_map:
                # Try fuzzy matching
                best_match, score = self._find_best_match(text, regions2)
                if score < self.config['text_similarity_threshold']:
                    mismatches.append(TextMismatch(
                        expected=text,
                        actual='',
                        confidence=region.confidence,
                        location=region.bbox,
                        mismatch_type='missing'
                    ))
                else:
                    mismatches.append(TextMismatch(
                        expected=text,
                        actual=best_match,
                        confidence=region.confidence,
                        location=region.bbox,
                        mismatch_type='different'
                    ))
        
        return mismatches
    
    def _detect_truncated_text(self, text_regions: List[TextRegion]) -> List[Dict[str, Any]]:
        """Detect potentially truncated text"""
        truncated = []
        
        for region in text_regions:
            # Check for common truncation patterns
            if region.text.endswith('...') or region.text.endswith('…'):
                truncated.append({
                    'text': region.text,
                    'location': region.bbox,
                    'confidence': region.confidence,
                    'type': 'ellipsis'
                })
            
            # Check if text is cut off at edge of bounding box
            # This would require image analysis at the bbox boundaries
            
        return truncated
    
    def _check_text_alignment(self, regions1: List[TextRegion], regions2: List[TextRegion]) -> List[Dict[str, Any]]:
        """Check for text alignment issues"""
        alignment_issues = []
        
        # Group regions by line number
        lines1 = {}
        lines2 = {}
        
        for r in regions1:
            if r.line_number not in lines1:
                lines1[r.line_number] = []
            lines1[r.line_number].append(r)
        
        for r in regions2:
            if r.line_number not in lines2:
                lines2[r.line_number] = []
            lines2[r.line_number].append(r)
        
        # Compare line alignments
        for line_num in lines1:
            if line_num in lines2:
                # Check vertical alignment
                y1_avg = np.mean([r.bbox[1] for r in lines1[line_num]])
                y2_avg = np.mean([r.bbox[1] for r in lines2[line_num]])
                
                if abs(y1_avg - y2_avg) > 5:  # 5 pixel threshold
                    alignment_issues.append({
                        'line': line_num,
                        'type': 'vertical',
                        'offset': y2_avg - y1_avg,
                        'text': ' '.join([r.text for r in lines1[line_num]])
                    })
        
        return alignment_issues
    
    def _find_best_match(self, target: str, regions: List[TextRegion]) -> Tuple[str, float]:
        """Find best matching text in regions using fuzzy matching"""
        best_match = ''
        best_score = 0
        
        for region in regions:
            score = difflib.SequenceMatcher(None, target, region.text).ratio()
            if score > best_score:
                best_score = score
                best_match = region.text
        
        return best_match, best_score
    
    def generate_text_overlay(self, image_path: str, text_regions: List[TextRegion], output_path: str):
        """Generate image with OCR text overlay for visualization"""
        img = cv2.imread(image_path)
        
        for region in text_regions:
            x, y, w, h = region.bbox
            
            # Draw bounding box
            color = (0, 255, 0) if region.confidence > 80 else (0, 165, 255)
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
            
            # Add text label
            label = f"{region.text} ({region.confidence:.0f}%)"
            cv2.putText(img, label, (x, y - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        cv2.imwrite(output_path, img)
        
    def extract_text_for_element(self, image_path: str, bbox: Tuple[int, int, int, int]) -> str:
        """Extract text from a specific region of the image"""
        img = cv2.imread(image_path)
        x, y, w, h = bbox
        
        # Crop to region
        cropped = img[y:y+h, x:x+w]
        
        # Apply OCR
        text = pytesseract.image_to_string(
            cropped,
            lang=self.config['language'],
            config=f'--psm 8 --oem {self.config["oem_mode"]}'  # Single word mode
        )
        
        return text.strip()

def compare_ui_text(image1_path: str, image2_path: str, output_dir: str = 'results'):
    """Utility function to compare text between two UI screenshots"""
    verifier = OCRTextVerifier()
    
    # Compare text
    results = verifier.compare_text(image1_path, image2_path)
    
    # Generate overlays
    os.makedirs(output_dir, exist_ok=True)
    
    regions1 = verifier.extract_text(image1_path)
    regions2 = verifier.extract_text(image2_path)
    
    verifier.generate_text_overlay(
        image1_path, regions1, 
        os.path.join(output_dir, 'text_overlay1.png')
    )
    
    verifier.generate_text_overlay(
        image2_path, regions2,
        os.path.join(output_dir, 'text_overlay2.png')
    )
    
    # Save results
    with open(os.path.join(output_dir, 'text_comparison.json'), 'w') as f:
        json.dump(results, f, indent=2)
    
    return results 