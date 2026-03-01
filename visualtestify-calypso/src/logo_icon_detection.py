"""
Logo/Icon Detection Module for VisualTestify Calypso
Uses template matching and feature detection to verify logos and icons
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import json
import os
from dataclasses import dataclass
from PIL import Image
import hashlib

@dataclass
class LogoMatch:
    """Represents a detected logo/icon match"""
    template_name: str
    location: Tuple[int, int, int, int]  # x, y, width, height
    confidence: float
    scale: float
    quality_score: float
    hash_match: bool

@dataclass
class IconIssue:
    """Represents an issue with an icon/logo"""
    icon_name: str
    issue_type: str  # 'missing', 'low_quality', 'wrong_variant', 'misaligned'
    details: Dict[str, Any]
    location: Optional[Tuple[int, int, int, int]]

class LogoIconDetector:
    """Detect and verify logos/icons in UI screenshots"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'match_threshold': 0.8,  # Template matching threshold
            'multi_scale': True,  # Enable multi-scale matching
            'scale_range': (0.5, 2.0),  # Min and max scale factors
            'scale_steps': 20,  # Number of scale steps
            'quality_threshold': 0.7,  # Minimum quality score
            'use_sift': True,  # Use SIFT features for robust matching
            'hash_bits': 16  # Bits for perceptual hashing
        }
        
        # Initialize feature detector
        self.sift = cv2.SIFT_create() if self.config['use_sift'] else None
        self.matcher = cv2.BFMatcher(cv2.NORM_L2, crossCheck=True) if self.sift else None
        
        # Template storage
        self.templates = {}
        self.template_hashes = {}
    
    def load_template(self, template_path: str, name: str):
        """
        Load a logo/icon template for matching
        
        Args:
            template_path: Path to template image
            name: Name identifier for the template
        """
        template = cv2.imread(template_path)
        if template is None:
            raise ValueError(f"Could not load template from {template_path}")
        
        # Store template
        self.templates[name] = template
        
        # Calculate perceptual hash
        self.template_hashes[name] = self._calculate_perceptual_hash(template)
        
        # Extract SIFT features if enabled
        if self.sift:
            gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            kp, desc = self.sift.detectAndCompute(gray, None)
            self.templates[f"{name}_features"] = (kp, desc)
    
    def detect_logos(self, image_path: str) -> List[LogoMatch]:
        """
        Detect all loaded logos/icons in the image
        
        Args:
            image_path: Path to the screenshot
            
        Returns:
            List of LogoMatch objects
        """
        img = cv2.imread(image_path)
        matches = []
        
        for template_name, template in self.templates.items():
            if '_features' in template_name:
                continue
            
            # Try template matching
            template_matches = self._template_matching(img, template, template_name)
            
            # Try feature matching if enabled
            if self.sift and f"{template_name}_features" in self.templates:
                feature_matches = self._feature_matching(img, template_name)
                template_matches.extend(feature_matches)
            
            # Remove duplicates and filter by confidence
            template_matches = self._filter_matches(template_matches)
            matches.extend(template_matches)
        
        return matches
    
    def verify_logo_quality(self, image_path: str, logo_match: LogoMatch) -> Dict[str, Any]:
        """
        Verify the quality of a detected logo
        
        Args:
            image_path: Path to the screenshot
            logo_match: LogoMatch object to verify
            
        Returns:
            Quality assessment results
        """
        img = cv2.imread(image_path)
        x, y, w, h = logo_match.location
        logo_region = img[y:y+h, x:x+w]
        
        # Calculate quality metrics
        quality_metrics = {
            'sharpness': self._calculate_sharpness(logo_region),
            'contrast': self._calculate_contrast(logo_region),
            'resolution_ratio': self._calculate_resolution_ratio(logo_region, logo_match.template_name),
            'color_accuracy': self._verify_colors(logo_region, logo_match.template_name),
            'edge_clarity': self._calculate_edge_clarity(logo_region)
        }
        
        # Overall quality score
        quality_score = np.mean(list(quality_metrics.values()))
        
        # Check for common issues
        issues = []
        if quality_metrics['sharpness'] < 0.5:
            issues.append('blurry')
        if quality_metrics['resolution_ratio'] < 0.8:
            issues.append('low_resolution')
        if quality_metrics['color_accuracy'] < 0.9:
            issues.append('color_mismatch')
        
        return {
            'quality_score': quality_score,
            'metrics': quality_metrics,
            'issues': issues,
            'acceptable': quality_score >= self.config['quality_threshold']
        }
    
    def compare_logos(self, image1_path: str, image2_path: str) -> Dict[str, Any]:
        """
        Compare logos/icons between two screenshots
        
        Args:
            image1_path: Path to baseline image
            image2_path: Path to comparison image
            
        Returns:
            Comparison results
        """
        # Detect logos in both images
        logos1 = self.detect_logos(image1_path)
        logos2 = self.detect_logos(image2_path)
        
        # Create lookup maps
        logos1_map = {l.template_name: l for l in logos1}
        logos2_map = {l.template_name: l for l in logos2}
        
        results = {
            'missing_logos': [],
            'added_logos': [],
            'position_changes': [],
            'quality_changes': [],
            'scale_changes': []
        }
        
        # Find missing logos
        for name in logos1_map:
            if name not in logos2_map:
                results['missing_logos'].append({
                    'name': name,
                    'location': logos1_map[name].location
                })
        
        # Find added logos
        for name in logos2_map:
            if name not in logos1_map:
                results['added_logos'].append({
                    'name': name,
                    'location': logos2_map[name].location
                })
        
        # Compare existing logos
        for name in logos1_map:
            if name in logos2_map:
                logo1 = logos1_map[name]
                logo2 = logos2_map[name]
                
                # Check position change
                if self._significant_position_change(logo1.location, logo2.location):
                    results['position_changes'].append({
                        'name': name,
                        'old_location': logo1.location,
                        'new_location': logo2.location,
                        'offset': self._calculate_offset(logo1.location, logo2.location)
                    })
                
                # Check scale change
                if abs(logo1.scale - logo2.scale) > 0.1:
                    results['scale_changes'].append({
                        'name': name,
                        'old_scale': logo1.scale,
                        'new_scale': logo2.scale
                    })
                
                # Check quality change
                quality1 = self.verify_logo_quality(image1_path, logo1)
                quality2 = self.verify_logo_quality(image2_path, logo2)
                
                if abs(quality1['quality_score'] - quality2['quality_score']) > 0.1:
                    results['quality_changes'].append({
                        'name': name,
                        'old_quality': quality1['quality_score'],
                        'new_quality': quality2['quality_score'],
                        'quality_degraded': quality2['quality_score'] < quality1['quality_score']
                    })
        
        return results
    
    def _template_matching(self, img: np.ndarray, template: np.ndarray, name: str) -> List[LogoMatch]:
        """Perform template matching with optional multi-scale"""
        matches = []
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        
        if self.config['multi_scale']:
            # Multi-scale template matching
            for scale in np.linspace(self.config['scale_range'][0], 
                                    self.config['scale_range'][1], 
                                    self.config['scale_steps']):
                # Resize template
                width = int(template.shape[1] * scale)
                height = int(template.shape[0] * scale)
                
                if width < 10 or height < 10:  # Skip very small scales
                    continue
                
                resized = cv2.resize(template_gray, (width, height))
                
                # Match template
                result = cv2.matchTemplate(img_gray, resized, cv2.TM_CCOEFF_NORMED)
                
                # Find matches above threshold
                locations = np.where(result >= self.config['match_threshold'])
                
                for pt in zip(*locations[::-1]):
                    match = LogoMatch(
                        template_name=name,
                        location=(pt[0], pt[1], width, height),
                        confidence=float(result[pt[1], pt[0]]),
                        scale=scale,
                        quality_score=0.0,  # Will be calculated later
                        hash_match=self._verify_hash_match(img, (pt[0], pt[1], width, height), name)
                    )
                    matches.append(match)
        else:
            # Single scale matching
            result = cv2.matchTemplate(img_gray, template_gray, cv2.TM_CCOEFF_NORMED)
            locations = np.where(result >= self.config['match_threshold'])
            
            for pt in zip(*locations[::-1]):
                match = LogoMatch(
                    template_name=name,
                    location=(pt[0], pt[1], template.shape[1], template.shape[0]),
                    confidence=float(result[pt[1], pt[0]]),
                    scale=1.0,
                    quality_score=0.0,
                    hash_match=self._verify_hash_match(img, 
                                                     (pt[0], pt[1], template.shape[1], template.shape[0]), 
                                                     name)
                )
                matches.append(match)
        
        return matches
    
    def _feature_matching(self, img: np.ndarray, template_name: str) -> List[LogoMatch]:
        """Use SIFT features for more robust matching"""
        matches = []
        
        if not self.sift or f"{template_name}_features" not in self.templates:
            return matches
        
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        kp_img, desc_img = self.sift.detectAndCompute(img_gray, None)
        
        kp_template, desc_template = self.templates[f"{template_name}_features"]
        
        if desc_img is None or desc_template is None:
            return matches
        
        # Match features
        feature_matches = self.matcher.match(desc_template, desc_img)
        
        if len(feature_matches) < 4:  # Need at least 4 points for homography
            return matches
        
        # Sort by distance
        feature_matches = sorted(feature_matches, key=lambda x: x.distance)
        
        # Extract matched points
        src_pts = np.float32([kp_template[m.queryIdx].pt for m in feature_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp_img[m.trainIdx].pt for m in feature_matches]).reshape(-1, 1, 2)
        
        # Find homography
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        
        if M is not None:
            # Get template dimensions
            h, w = self.templates[template_name].shape[:2]
            pts = np.float32([[0, 0], [0, h-1], [w-1, h-1], [w-1, 0]]).reshape(-1, 1, 2)
            
            # Transform corners
            dst = cv2.perspectiveTransform(pts, M)
            
            # Get bounding box
            x, y, w, h = cv2.boundingRect(dst)
            
            # Calculate confidence based on inliers
            confidence = np.sum(mask) / len(mask)
            
            match = LogoMatch(
                template_name=template_name,
                location=(x, y, w, h),
                confidence=confidence,
                scale=w / self.templates[template_name].shape[1],
                quality_score=0.0,
                hash_match=self._verify_hash_match(img, (x, y, w, h), template_name)
            )
            matches.append(match)
        
        return matches
    
    def _calculate_perceptual_hash(self, img: np.ndarray) -> str:
        """Calculate perceptual hash of an image"""
        # Resize to fixed size
        resized = cv2.resize(img, (self.config['hash_bits'], self.config['hash_bits']))
        
        # Convert to grayscale
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        # Calculate mean
        mean = np.mean(gray)
        
        # Create binary string
        hash_str = ''
        for pixel in gray.flatten():
            hash_str += '1' if pixel > mean else '0'
        
        # Convert to hex
        return hex(int(hash_str, 2))[2:]
    
    def _verify_hash_match(self, img: np.ndarray, bbox: Tuple[int, int, int, int], template_name: str) -> bool:
        """Verify if detected region matches template hash"""
        x, y, w, h = bbox
        region = img[y:y+h, x:x+w]
        
        region_hash = self._calculate_perceptual_hash(region)
        template_hash = self.template_hashes.get(template_name, '')
        
        # Calculate Hamming distance
        if len(region_hash) == len(template_hash):
            distance = sum(c1 != c2 for c1, c2 in zip(region_hash, template_hash))
            return distance < len(region_hash) * 0.1  # Allow 10% difference
        
        return False
    
    def _calculate_sharpness(self, img: np.ndarray) -> float:
        """Calculate image sharpness using Laplacian variance"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        
        # Normalize to 0-1 range
        return min(variance / 1000, 1.0)
    
    def _calculate_contrast(self, img: np.ndarray) -> float:
        """Calculate image contrast"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        min_val = np.min(gray)
        max_val = np.max(gray)
        
        contrast = (max_val - min_val) / 255.0
        return contrast
    
    def _calculate_resolution_ratio(self, region: np.ndarray, template_name: str) -> float:
        """Calculate resolution ratio compared to template"""
        if template_name not in self.templates:
            return 1.0
        
        template = self.templates[template_name]
        region_pixels = region.shape[0] * region.shape[1]
        template_pixels = template.shape[0] * template.shape[1]
        
        return min(region_pixels / template_pixels, 1.0)
    
    def _verify_colors(self, region: np.ndarray, template_name: str) -> float:
        """Verify color accuracy"""
        if template_name not in self.templates:
            return 1.0
        
        template = self.templates[template_name]
        
        # Resize region to match template
        resized = cv2.resize(region, (template.shape[1], template.shape[0]))
        
        # Calculate color histogram similarity
        hist1 = cv2.calcHist([template], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist2 = cv2.calcHist([resized], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        
        # Normalize histograms
        hist1 = cv2.normalize(hist1, hist1).flatten()
        hist2 = cv2.normalize(hist2, hist2).flatten()
        
        # Calculate correlation
        correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        
        return max(0, correlation)
    
    def _calculate_edge_clarity(self, img: np.ndarray) -> float:
        """Calculate edge clarity using Canny edge detection"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        
        # Calculate ratio of edge pixels
        edge_ratio = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        
        # Optimal edge ratio is around 0.1-0.3
        if edge_ratio < 0.1:
            return edge_ratio * 10
        elif edge_ratio > 0.3:
            return 1.0 - (edge_ratio - 0.3) * 2
        else:
            return 1.0
    
    def _filter_matches(self, matches: List[LogoMatch]) -> List[LogoMatch]:
        """Filter and deduplicate matches"""
        if not matches:
            return matches
        
        # Sort by confidence
        matches.sort(key=lambda x: x.confidence, reverse=True)
        
        # Non-maximum suppression
        filtered = []
        for match in matches:
            # Check if this match overlaps with existing filtered matches
            overlap = False
            for filtered_match in filtered:
                if self._calculate_iou(match.location, filtered_match.location) > 0.5:
                    overlap = True
                    break
            
            if not overlap:
                filtered.append(match)
        
        return filtered
    
    def _calculate_iou(self, bbox1: Tuple[int, int, int, int], bbox2: Tuple[int, int, int, int]) -> float:
        """Calculate Intersection over Union"""
        x1, y1, w1, h1 = bbox1
        x2, y2, w2, h2 = bbox2
        
        # Calculate intersection
        xi1 = max(x1, x2)
        yi1 = max(y1, y2)
        xi2 = min(x1 + w1, x2 + w2)
        yi2 = min(y1 + h1, y2 + h2)
        
        if xi2 < xi1 or yi2 < yi1:
            return 0.0
        
        intersection = (xi2 - xi1) * (yi2 - yi1)
        
        # Calculate union
        area1 = w1 * h1
        area2 = w2 * h2
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def _significant_position_change(self, loc1: Tuple[int, int, int, int], 
                                   loc2: Tuple[int, int, int, int], 
                                   threshold: int = 10) -> bool:
        """Check if position change is significant"""
        x1, y1, _, _ = loc1
        x2, y2, _, _ = loc2
        
        return abs(x1 - x2) > threshold or abs(y1 - y2) > threshold
    
    def _calculate_offset(self, loc1: Tuple[int, int, int, int], 
                         loc2: Tuple[int, int, int, int]) -> Dict[str, int]:
        """Calculate position offset"""
        x1, y1, _, _ = loc1
        x2, y2, _, _ = loc2
        
        return {
            'x_offset': x2 - x1,
            'y_offset': y2 - y1,
            'distance': int(np.sqrt((x2 - x1)**2 + (y2 - y1)**2))
        } 