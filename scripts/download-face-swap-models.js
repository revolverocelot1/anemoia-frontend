const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Model URLs
const MODELS = {
  blazeface: {
    url: 'https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/version-RFB-320.onnx',
    filename: 'blazeface.onnx',
    size: '1.2MB'
  },
  landmarks: {
    url: 'https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip',
    filename: 'face_landmarks_68.onnx',
    size: '5MB',
    note: 'This is part of buffalo_l package - extract the landmarks model'
  },
  inswapper: {
    url: 'https://github.com/facefusion/facefusion-assets/releases/download/models/inswapper_128.onnx',
    filename: 'inswapper_128.onnx',
    size: '120MB'
  },
  gfpgan: {
    url: 'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth',
    filename: 'gfpgan_lite.onnx',
    size: '50MB',
    note: 'This is PyTorch model - needs conversion to ONNX'
  }
};

// Create models directory
const modelsDir = path.join(process.cwd(), 'public', 'models', 'face-swap');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('✅ Created models directory:', modelsDir);
}

// Download function
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`📥 Downloading ${path.basename(filepath)}...`);
    
    protocol.get(url, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.pipe(file);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}%`);
      });
      
      file.on('finish', () => {
        file.close();
        console.log(`\n✅ Downloaded ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Main download function
async function downloadModels() {
  console.log('🚀 Face Swap Model Downloader\n');
  console.log('This will download the required models for face swapping.\n');
  
  // Check which models already exist
  const existingModels = [];
  const missingModels = [];
  
  for (const [key, model] of Object.entries(MODELS)) {
    const filepath = path.join(modelsDir, model.filename);
    if (fs.existsSync(filepath)) {
      existingModels.push(model.filename);
    } else {
      missingModels.push({ key, model, filepath });
    }
  }
  
  if (existingModels.length > 0) {
    console.log('✅ Found existing models:');
    existingModels.forEach(name => console.log(`   - ${name}`));
    console.log('');
  }
  
  if (missingModels.length === 0) {
    console.log('✅ All models are already downloaded!');
    return;
  }
  
  console.log('📋 Models to download:');
  missingModels.forEach(({ model }) => {
    console.log(`   - ${model.filename} (${model.size})`);
    if (model.note) {
      console.log(`     ⚠️  ${model.note}`);
    }
  });
  console.log('');
  
  // Download missing models
  for (const { key, model, filepath } of missingModels) {
    try {
      await downloadFile(model.url, filepath);
    } catch (error) {
      console.error(`❌ Failed to download ${model.filename}:`, error.message);
      console.log(`   Please download manually from: ${model.url}`);
    }
  }
  
  console.log('\n🎉 Download complete!');
  console.log('\n⚠️  Important Notes:');
  console.log('1. Some models may need conversion from PyTorch to ONNX format');
  console.log('2. The landmarks model needs to be extracted from buffalo_l.zip');
  console.log('3. For production use, consider using FP16 quantized models for better performance');
  console.log('\n📚 For manual downloads and alternatives, see MODEL_SETUP_GUIDE.md');
}

// Run downloader
downloadModels().catch(console.error); 