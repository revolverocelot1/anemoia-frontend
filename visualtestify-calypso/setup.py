"""
Setup script for VisualTestify Calypso
Handles installation and initial configuration
"""

import os
import sys
import subprocess
import platform

def main():
    print("\n" + "="*60)
    print("VisualTestify Calypso - Setup Script")
    print("="*60 + "\n")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print("✓ Python version:", sys.version.split()[0])
    
    # Install pip packages
    print("\n📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        print("   Please run: pip install -r requirements.txt")
        sys.exit(1)
    
    # Install Playwright browsers
    print("\n🌐 Installing Playwright browsers...")
    try:
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        print("✓ Playwright browsers installed")
    except subprocess.CalledProcessError:
        print("⚠️  Failed to install Playwright browsers")
        print("   Please run: playwright install chromium")
    
    # Check Tesseract OCR
    print("\n🔍 Checking Tesseract OCR installation...")
    tesseract_found = False
    
    try:
        subprocess.check_output(["tesseract", "--version"])
        tesseract_found = True
        print("✓ Tesseract OCR found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  Tesseract OCR not found")
        
        if platform.system() == "Windows":
            print("\n   To install Tesseract on Windows:")
            print("   1. Download from: https://github.com/UB-Mannheim/tesseract/wiki")
            print("   2. Install and add to PATH")
            print("   3. Or update the path in src/ocr_text_check.py")
        elif platform.system() == "Linux":
            print("\n   To install Tesseract on Linux:")
            print("   Run: sudo apt-get install tesseract-ocr")
        elif platform.system() == "Darwin":
            print("\n   To install Tesseract on macOS:")
            print("   Run: brew install tesseract")
    
    # Create necessary directories
    print("\n📁 Creating directories...")
    directories = ['results', 'uploads', 'templates', 'logo_templates']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"   ✓ Created {directory}/")
    
    # Create example files
    print("\n📄 Creating example files...")
    
    # Example logo template info
    with open('logo_templates/README.txt', 'w') as f:
        f.write("Place your logo/icon template images here (PNG/JPG format)\n")
        f.write("These will be used for logo detection and quality verification\n")
    
    print("   ✓ Created logo_templates/README.txt")
    
    print("\n" + "="*60)
    print("✅ Setup Complete!")
    print("="*60)
    
    print("\n🚀 Quick Start:")
    print("\n1. Test with Calypso screenshots:")
    print("   python test_calypso.py")
    
    print("\n2. Run the web dashboard:")
    print("   python app.py")
    print("   Then open: http://localhost:5000")
    
    print("\n3. Command-line comparison:")
    print("   python compare.py compare-screenshots image1.png image2.png")
    
    if not tesseract_found:
        print("\n⚠️  Note: OCR features will not work until Tesseract is installed")
    
    print("\n📚 See README.md for detailed documentation\n")

if __name__ == "__main__":
    main() 