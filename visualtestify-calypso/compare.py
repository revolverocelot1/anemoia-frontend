"""
Main Comparison Script for VisualTestify Calypso
Orchestrates all comparison modules for comprehensive UI testing
"""

import os
import sys
import argparse
import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import all modules
from image_diff import ImageComparisonEngine
from extract_css import DOMCSSExtractor
from ocr_text_check import OCRTextVerifier
from logo_icon_detection import LogoIconDetector
from report_generator import ReportGenerator

class VisualTestifyCalypso:
    """Main orchestrator for visual UI comparison"""
    
    def __init__(self, config_path: Optional[str] = None):
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Initialize all engines
        self.image_engine = ImageComparisonEngine(self.config.get('image', {}))
        self.ocr_engine = OCRTextVerifier(self.config.get('ocr', {}))
        self.logo_engine = LogoIconDetector(self.config.get('logo', {}))
        self.report_generator = ReportGenerator(self.config.get('report', {}))
        
        # DOM/CSS extractor will be initialized when needed (async)
        self.dom_engine = None
    
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from file or use defaults"""
        default_config = {
            'image': {
                'ssim_window_size': 11,
                'pixel_diff_threshold': 10,
                'min_contour_area': 100
            },
            'ocr': {
                'confidence_threshold': 70,
                'language': 'eng',
                'preprocessing': True
            },
            'logo': {
                'match_threshold': 0.8,
                'multi_scale': True,
                'quality_threshold': 0.7,
                'use_sift': True
            },
            'report': {
                'title': 'VisualTestify Calypso - UI Comparison Report',
                'theme': 'dark',
                'include_technical_details': True
            }
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                for key in default_config:
                    if key in user_config:
                        default_config[key].update(user_config[key])
        
        return default_config
    
    def compare_screenshots(self, baseline_path: str, comparison_path: str, 
                          output_dir: str = 'results', 
                          test_name: str = 'ui_test') -> Dict[str, Any]:
        """
        Main comparison function for screenshots only
        
        Args:
            baseline_path: Path to baseline screenshot
            comparison_path: Path to comparison screenshot
            output_dir: Directory to save results
            test_name: Name for this test run
            
        Returns:
            Dictionary containing all comparison results
        """
        print(f"\n🔍 Starting Visual Comparison: {test_name}")
        print(f"   Baseline: {baseline_path}")
        print(f"   Comparison: {comparison_path}")
        
        # Create output directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        test_output_dir = os.path.join(output_dir, f"{test_name}_{timestamp}")
        os.makedirs(test_output_dir, exist_ok=True)
        
        results = {
            'test_name': test_name,
            'timestamp': timestamp,
            'baseline_image_path': baseline_path,
            'comparison_image_path': comparison_path
        }
        
        # 1. Image Comparison
        print("\n📊 Running image comparison...")
        try:
            image_results = self.image_engine.compare_images(
                baseline_path, comparison_path, test_output_dir
            )
            results['image_comparison'] = image_results
            print(f"   ✓ Composite Score: {image_results['composite_score']:.1f}%")
            print(f"   ✓ SSIM Score: {image_results['ssim_score']['score']:.3f}")
        except Exception as e:
            print(f"   ✗ Image comparison failed: {e}")
            results['image_comparison'] = {'error': str(e)}
        
        # 2. OCR Text Analysis
        print("\n📝 Running OCR text analysis...")
        try:
            text_results = self.ocr_engine.compare_text(baseline_path, comparison_path)
            results['text_comparison'] = text_results
            print(f"   ✓ Text Similarity: {text_results['text_similarity']*100:.1f}%")
            print(f"   ✓ Mismatches Found: {len(text_results['mismatches'])}")
        except Exception as e:
            print(f"   ✗ OCR analysis failed: {e}")
            results['text_comparison'] = {'error': str(e)}
        
        # 3. Logo/Icon Detection (if templates are loaded)
        if self.logo_engine.templates:
            print("\n🎨 Running logo/icon detection...")
            try:
                logo_results = self.logo_engine.compare_logos(baseline_path, comparison_path)
                results['logo_comparison'] = logo_results
                print(f"   ✓ Missing Logos: {len(logo_results['missing_logos'])}")
                print(f"   ✓ Quality Issues: {len(logo_results['quality_changes'])}")
            except Exception as e:
                print(f"   ✗ Logo detection failed: {e}")
                results['logo_comparison'] = {'error': str(e)}
        else:
            print("\n⚠️  No logo templates loaded, skipping logo detection")
        
        # 4. Generate Report
        print("\n📄 Generating HTML report...")
        try:
            report_path = os.path.join(test_output_dir, 'report.html')
            self.report_generator.generate_report(results, report_path)
            results['report_path'] = report_path
            print(f"   ✓ Report saved to: {report_path}")
        except Exception as e:
            print(f"   ✗ Report generation failed: {e}")
        
        # Save raw results
        results_path = os.path.join(test_output_dir, 'results.json')
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n✅ Comparison complete! Results saved to: {test_output_dir}")
        
        return results
    
    async def compare_urls(self, baseline_url: str, comparison_url: str,
                          output_dir: str = 'results',
                          test_name: str = 'url_test') -> Dict[str, Any]:
        """
        Compare two URLs by capturing screenshots and extracting DOM/CSS
        
        Args:
            baseline_url: URL of baseline version
            comparison_url: URL of comparison version
            output_dir: Directory to save results
            test_name: Name for this test run
            
        Returns:
            Dictionary containing all comparison results
        """
        print(f"\n🌐 Starting URL Comparison: {test_name}")
        print(f"   Baseline URL: {baseline_url}")
        print(f"   Comparison URL: {comparison_url}")
        
        # Initialize DOM engine
        if not self.dom_engine:
            self.dom_engine = DOMCSSExtractor()
            await self.dom_engine.initialize()
        
        # Create output directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        test_output_dir = os.path.join(output_dir, f"{test_name}_{timestamp}")
        os.makedirs(test_output_dir, exist_ok=True)
        
        results = {
            'test_name': test_name,
            'timestamp': timestamp,
            'baseline_url': baseline_url,
            'comparison_url': comparison_url
        }
        
        try:
            # Extract DOM and capture screenshots
            print("\n🖼️  Capturing screenshots and extracting DOM...")
            
            baseline_data = await self.dom_engine.extract_from_url(baseline_url)
            comparison_data = await self.dom_engine.extract_from_url(comparison_url)
            
            # Save screenshots
            baseline_screenshot = os.path.join(test_output_dir, 'baseline.png')
            comparison_screenshot = os.path.join(test_output_dir, 'comparison.png')
            
            with open(baseline_screenshot, 'wb') as f:
                f.write(baseline_data['screenshot'])
            with open(comparison_screenshot, 'wb') as f:
                f.write(comparison_data['screenshot'])
            
            # Run screenshot comparison
            screenshot_results = self.compare_screenshots(
                baseline_screenshot, comparison_screenshot,
                test_output_dir, test_name
            )
            results.update(screenshot_results)
            
            # Compare DOM/CSS
            print("\n🔧 Comparing DOM/CSS structure...")
            css_results = self.dom_engine.compare_dom_css(
                baseline_data['dom_data'],
                comparison_data['dom_data']
            )
            results['css_comparison'] = css_results
            print(f"   ✓ DOM Similarity: {css_results['similarity_score']:.1f}%")
            print(f"   ✓ CSS Differences: {len(css_results['css_differences'])}")
            
            # Generate CSS report
            css_report_path = os.path.join(test_output_dir, 'css_diff_report.json')
            self.dom_engine.generate_css_diff_report(css_results, css_report_path)
            
        except Exception as e:
            print(f"\n❌ URL comparison failed: {e}")
            results['error'] = str(e)
        
        return results
    
    def load_logo_templates(self, template_dir: str):
        """Load logo/icon templates from a directory"""
        if not os.path.exists(template_dir):
            print(f"⚠️  Template directory not found: {template_dir}")
            return
        
        print(f"\n📁 Loading logo templates from: {template_dir}")
        
        for filename in os.listdir(template_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                template_path = os.path.join(template_dir, filename)
                template_name = os.path.splitext(filename)[0]
                
                try:
                    self.logo_engine.load_template(template_path, template_name)
                    print(f"   ✓ Loaded: {template_name}")
                except Exception as e:
                    print(f"   ✗ Failed to load {filename}: {e}")

def main():
    """Command-line interface"""
    parser = argparse.ArgumentParser(
        description='VisualTestify Calypso - Visual UI Comparison Tool'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Screenshot comparison command
    screenshot_parser = subparsers.add_parser(
        'compare-screenshots',
        help='Compare two screenshots'
    )
    screenshot_parser.add_argument('baseline', help='Path to baseline screenshot')
    screenshot_parser.add_argument('comparison', help='Path to comparison screenshot')
    screenshot_parser.add_argument('--output', '-o', default='results', help='Output directory')
    screenshot_parser.add_argument('--name', '-n', default='ui_test', help='Test name')
    screenshot_parser.add_argument('--config', '-c', help='Configuration file path')
    screenshot_parser.add_argument('--logo-dir', help='Directory containing logo templates')
    
    # URL comparison command
    url_parser = subparsers.add_parser(
        'compare-urls',
        help='Compare two URLs'
    )
    url_parser.add_argument('baseline_url', help='Baseline URL')
    url_parser.add_argument('comparison_url', help='Comparison URL')
    url_parser.add_argument('--output', '-o', default='results', help='Output directory')
    url_parser.add_argument('--name', '-n', default='url_test', help='Test name')
    url_parser.add_argument('--config', '-c', help='Configuration file path')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize the tool
    tool = VisualTestifyCalypso(args.config if hasattr(args, 'config') else None)
    
    if args.command == 'compare-screenshots':
        # Load logo templates if provided
        if args.logo_dir:
            tool.load_logo_templates(args.logo_dir)
        
        # Run comparison
        results = tool.compare_screenshots(
            args.baseline,
            args.comparison,
            args.output,
            args.name
        )
        
        # Print summary
        if 'image_comparison' in results and 'composite_score' in results['image_comparison']:
            score = results['image_comparison']['composite_score']
            print(f"\n{'='*50}")
            print(f"Overall Similarity Score: {score:.1f}%")
            print(f"{'='*50}")
    
    elif args.command == 'compare-urls':
        # Run async comparison
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(
            tool.compare_urls(
                args.baseline_url,
                args.comparison_url,
                args.output,
                args.name
            )
        )

if __name__ == '__main__':
    main() 