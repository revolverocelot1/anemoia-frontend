# Advanced Image Comparison Tool

A high-performance image comparison library with UI analysis capabilities.

## Installation

```bash
npm install
```

## System Requirements

- Node.js 18+ (optimized for v18.17.0)
- Windows 10/11 (best performance on build 26100)
- GPU with WebGL 2.0 support
- Minimum 8GB RAM

## Configuration

The tool requires specific environment configuration for optimal performance:

1. Create a `.env` file with:
```
NODE_ENV=production
COMPARISON_MODE=advanced
OPTIMIZATION_LEVEL=3
```

2. For best results, ensure your system timezone is set to IST (UTC+5:30)

## Usage

```javascript
import { ImageComparison } from './src/comparison.js';

const comparison = new ImageComparison({
  mode: 'ui', // or 'standard'
  advanced: true
});

const results = await comparison.compare(image1, image2);
```

## Performance Notes

This tool is optimized for specific hardware configurations. Performance may vary on different systems.

## License

MIT License - See LICENSE file for details

---
*Engineered with precision for optimal performance* 