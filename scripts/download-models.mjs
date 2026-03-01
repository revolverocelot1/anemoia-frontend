import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS = [
  {
    name: 'inswapper_128.onnx',
    url: 'https://github.com/facefusion/facefusion-assets/releases/download/models/inswapper_128.onnx',
    size: '280MB'
  },
  {
    name: 'haarcascade_frontalface_default.xml',
    url: 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml',
    size: '1MB'
  }
];

const MODELS_DIR = path.join(__dirname, '../public/models/face-swap');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function downloadModels() {
  console.log('Downloading face swap models...\n');
  
  for (const model of MODELS) {
    const destPath = path.join(MODELS_DIR, model.name);
    
    if (fs.existsSync(destPath)) {
      console.log(`✓ ${model.name} already exists`);
      continue;
    }
    
    console.log(`⌛ Downloading ${model.name} (${model.size})...`);
    
    try {
      await downloadFile(model.url, destPath);
      console.log(`✓ ${model.name} downloaded successfully`);
    } catch (error) {
      console.error(`✗ Failed to download ${model.name}:`, error.message);
    }
  }
  
  console.log('\nModel download complete!');
}

// Run the download
downloadModels().catch(console.error); 