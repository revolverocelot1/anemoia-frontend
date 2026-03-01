# VisualTestify Calypso

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

An advanced Visual UI Testing Framework for NASDAQ-Calypso applications with support for intelligent image comparison, AI-powered accuracy assessment, URL/DOM comparisons, and OCR-based text verification.

![VisualTestify Dashboard](https://via.placeholder.com/800x400/1a1a1a/4a9eff?text=VisualTestify+Calypso+Dashboard)

## 🚀 Features

### Core Functionality
- **Screenshot Comparison**: Compare baseline and test screenshots with multiple algorithms
- **URL Comparison**: Capture and compare live web pages
- **Batch Processing**: Process multiple image pairs in one go
- **AI-Powered Analysis**: Uses AI models for intelligent comparison

### New Features (v2.0)
- **🎛️ Configuration Settings Panel**: Adjust comparison thresholds in real-time
- **📊 Export Functionality**: Export results in JSON, CSV, PDF, or HTML formats
- **📚 Batch Comparison History**: Track and review batch processing results
- **🔍 Advanced Filters**: Filter results by date, score, and test name
- **🎨 Modern Dark UI**: Beautiful, responsive interface with glassmorphism effects
- **📈 Real-time Progress**: Live progress tracking for comparisons
- **💾 Local Storage**: Persist settings and history between sessions

### Comparison Engines
1. **Image Comparison Engine**
   - SSIM (Structural Similarity Index)
   - Perceptual hash comparison
   - Pixel difference analysis
   - AI-powered visual similarity using ResNet50

2. **OCR Engine**
   - Text extraction from images
   - Text similarity comparison
   - Support for multiple languages

3. **DOM Comparison Engine** (for URL comparisons)
   - DOM structure analysis
   - Element-wise comparison
   - CSS style comparison

## 📋 Requirements

- Python 3.8 or higher
- Chrome/Chromium browser (for URL comparisons)
- Node.js (optional, for advanced features)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/revolverocelot1/visualtestify-calypso.git
cd visualtestify-calypso
```

2. Create a virtual environment:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix/MacOS
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Playwright browsers (for URL comparison):
```bash
playwright install chromium
```

## 🚀 Quick Start

### Web Dashboard

Start the Flask web server:
```bash
python app.py
```

Navigate to `http://localhost:5000` in your browser.

### Command Line Usage

```python
from compare import VisualTestifyCalypso

# Initialize the comparison tool
vtc = VisualTestifyCalypso()

# Compare screenshots
results = vtc.compare_screenshots(
    "baseline.png",
    "test.png",
    output_dir="results",
    test_name="login_page_test"
)

# Compare URLs
results = await vtc.compare_urls(
    "https://example.com/v1",
    "https://example.com/v2",
    output_dir="results",
    test_name="homepage_comparison"
)
```

## 🎯 Usage Examples

### 1. Screenshot Comparison

Upload two images through the web interface:
- Click on the baseline image area or drag & drop
- Click on the comparison image area or drag & drop
- Enter an optional test name
- Click "Start Comparison"

### 2. URL Comparison

Compare two live websites:
- Switch to "URL Comparison" mode
- Enter the baseline URL
- Enter the comparison URL
- Click "Start Comparison"

### 3. Batch Processing

Process multiple image pairs:
- Switch to "Batch Processing" mode
- Select multiple files (baseline1.png, comparison1.png, baseline2.png, etc.)
- Click "Start Comparison"

### 4. Configuration Settings

Adjust comparison sensitivity:
- Click the settings icon (⚙️)
- Adjust SSIM threshold (0-100%)
- Adjust perceptual difference threshold
- Adjust text similarity threshold
- Select default export format
- Click "Save Settings"

### 5. Advanced Filtering

Filter comparison results:
- Click the filter icon (🔍)
- Set date range
- Set similarity score range (0-100%)
- Enter test name keywords
- Click "Apply Filters"

### 6. Export Results

Export comparison data:
- After running a comparison
- Click "Export Results"
- Choose format: JSON, CSV, PDF, or HTML

## 📊 Understanding Results

### Similarity Scores

- **Composite Score**: Overall similarity percentage (0-100%)
- **SSIM Score**: Structural similarity (0-1, higher is better)
- **Text Match**: OCR text similarity percentage
- **Visual Diff**: Pixel difference percentage

### Score Interpretation

- 🟢 **90-100%**: Excellent match, minimal differences
- 🟡 **70-89%**: Good match, some acceptable differences
- 🔴 **0-69%**: Poor match, significant differences

## ⚙️ Configuration

### Default Configuration (calypso_config.json)

```json
{
  "comparison_mode": "intelligent",
  "thresholds": {
    "ssim": 0.85,
    "perceptual": 10,
    "text_similarity": 0.90,
    "ai_confidence": 0.75
  },
  "export": {
    "format": "json",
    "include_images": true
  }
}
```

### Environment Variables

- `FLASK_PORT`: Web server port (default: 5000)
- `MAX_UPLOAD_SIZE`: Maximum file size in MB (default: 50)
- `RESULTS_RETENTION_DAYS`: Days to keep results (default: 30)

## 🤝 API Reference

### REST API Endpoints

#### Compare Screenshots
```http
POST /api/compare/screenshots
Content-Type: multipart/form-data

Form Data:
- baseline: Image file
- comparison: Image file
- test_name: String (optional)
```

#### Compare URLs
```http
POST /api/compare/urls
Content-Type: application/json

{
  "baseline_url": "https://example.com/v1",
  "comparison_url": "https://example.com/v2",
  "test_name": "homepage_test"
}
```

#### Get Job Status
```http
GET /api/jobs/{job_id}/status
```

#### List Results
```http
GET /api/results
```

#### Update Configuration
```http
POST /api/config
Content-Type: application/json

{
  "image_comparison": {
    "ssim_threshold": 0.85,
    "perceptual_threshold": 10
  }
}
```

## 🧪 Testing

Run the test suite:
```bash
pytest tests/
```

Run specific tests:
```bash
pytest tests/test_image_comparison.py -v
```

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to upload images"**
   - Check file size (max 50MB)
   - Ensure files are valid image formats (PNG, JPG, GIF)

2. **"Playwright not installed"**
   - Run `playwright install chromium`

3. **"OCR extraction failed"**
   - Install Tesseract: `apt-get install tesseract-ocr`

4. **"AI model not loaded"**
   - Models are downloaded on first use
   - Ensure stable internet connection

## 📈 Performance Tips

- Use smaller images for faster processing
- Batch processing is more efficient than individual comparisons
- Adjust thresholds based on your needs (lower = more sensitive)
- Enable GPU acceleration for AI models if available

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NASDAQ-Calypso team for requirements and feedback
- OpenCV community for image processing algorithms
- Playwright team for browser automation
- TensorFlow/Keras for AI models

## 📞 Contact

- **Author**: VisualTestify Team
- **Email**: support@visualtestify.com
- **GitHub**: [@revolverocelot1/visualtestify-calypso](https://github.com/revolverocelot1/visualtestify-calypso)

---

<p align="center">Made with ❤️ for NASDAQ-Calypso</p> 