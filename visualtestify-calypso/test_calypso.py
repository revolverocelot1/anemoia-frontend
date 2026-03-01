"""
Test script for VisualTestify Calypso using provided screenshots
This demonstrates the tool's capabilities with real Calypso UI screenshots
"""

import os
import sys
from compare import VisualTestifyCalypso
import shutil

def test_calypso_screenshots():
    """Test the tool with provided Calypso screenshots"""
    
    print("\n" + "="*60)
    print("VisualTestify Calypso - Test with Calypso Screenshots")
    print("="*60 + "\n")
    
    # Initialize the tool
    tool = VisualTestifyCalypso()
    
    # Define test cases - using the provided Calypso screenshots
    test_cases = [
        {
            'name': 'calypso_ui_test_1',
            'baseline': '../calypso/WhatsApp Image 2025-07-28 at 00.41.28_5abe3c4b.jpg',
            'comparison': '../calypso/WhatsApp Image 2025-07-28 at 00.41.28_639c01a8.jpg',
            'description': 'Comparing two Calypso UI versions'
        },
        {
            'name': 'calypso_ui_test_2',
            'baseline': '../calypso/WhatsApp Image 2025-07-28 at 00.41.29_eb92214b.jpg',
            'comparison': '../calypso/WhatsApp Image 2025-07-28 at 00.42.55_b05e0b6b.jpg',
            'description': 'Comparing different Calypso screens'
        }
    ]
    
    # Run tests
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*40}")
        print(f"Test {i}: {test['name']}")
        print(f"Description: {test['description']}")
        print(f"{'='*40}\n")
        
        try:
            # Run comparison
            results = tool.compare_screenshots(
                test['baseline'],
                test['comparison'],
                output_dir='calypso_test_results',
                test_name=test['name']
            )
            
            # Print summary
            if 'image_comparison' in results:
                img_results = results['image_comparison']
                print(f"\n📊 Comparison Results:")
                print(f"   - Composite Score: {img_results.get('composite_score', 0):.1f}%")
                print(f"   - SSIM Score: {img_results.get('ssim_score', {}).get('score', 0):.3f}")
                print(f"   - Pixel Difference: {img_results.get('pixel_diff', {}).get('percentage', 0):.2f}%")
                print(f"   - Cosine Similarity: {img_results.get('cosine_similarity', 0):.3f}")
                print(f"   - Difference Regions Found: {len(img_results.get('difference_regions', []))}")
            
            if 'text_comparison' in results:
                text_results = results['text_comparison']
                print(f"\n📝 Text Analysis:")
                print(f"   - Text Similarity: {text_results.get('text_similarity', 1) * 100:.1f}%")
                print(f"   - Word Count (Baseline): {text_results.get('baseline_word_count', 0)}")
                print(f"   - Word Count (Comparison): {text_results.get('comparison_word_count', 0)}")
                print(f"   - Text Mismatches: {len(text_results.get('mismatches', []))}")
            
            print(f"\n✅ Report generated: {results.get('report_path', 'N/A')}")
            
        except Exception as e:
            print(f"\n❌ Test failed: {str(e)}")
    
    print("\n" + "="*60)
    print("All tests completed! Check 'calypso_test_results' directory for detailed reports.")
    print("="*60 + "\n")

def demo_features():
    """Demonstrate specific features of the tool"""
    
    print("\n🔍 Demonstrating Advanced Features:\n")
    
    # Initialize tool with custom config
    custom_config = {
        'image': {
            'pixel_diff_threshold': 5,  # More sensitive to changes
            'min_contour_area': 50
        },
        'ocr': {
            'confidence_threshold': 60,  # Lower threshold for better text detection
            'preprocessing': True
        }
    }
    
    # Save custom config
    import json
    with open('custom_config.json', 'w') as f:
        json.dump(custom_config, f, indent=2)
    
    # Initialize with custom config
    tool = VisualTestifyCalypso('custom_config.json')
    
    print("✓ Initialized with custom configuration")
    print("  - More sensitive pixel difference detection")
    print("  - Enhanced OCR preprocessing")
    
    # Clean up
    os.remove('custom_config.json')

if __name__ == '__main__':
    # Create test results directory
    os.makedirs('calypso_test_results', exist_ok=True)
    
    # Run main tests
    test_calypso_screenshots()
    
    # Demonstrate features
    demo_features()
    
    # Print usage instructions
    print("\n📚 Next Steps:")
    print("1. View the generated HTML reports in 'calypso_test_results' directory")
    print("2. Run the web dashboard: python app.py")
    print("3. Try comparing your own Calypso screenshots")
    print("4. Integrate with your CI/CD pipeline\n") 