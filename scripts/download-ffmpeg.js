import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FFMPEG_VERSION = '0.12.10';
const CDN_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/umd`;

const files = [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-core.worker.js'
];

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function downloadFFmpegFiles() {
  const ffmpegDir = path.join(__dirname, '..', 'public', 'ffmpeg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(ffmpegDir)) {
    fs.mkdirSync(ffmpegDir, { recursive: true });
  }

  console.log(`Downloading FFmpeg ${FFMPEG_VERSION} files...`);

  for (const file of files) {
    const url = `${CDN_BASE}/${file}`;
    const dest = path.join(ffmpegDir, file);
    
    console.log(`Downloading ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`✓ Downloaded ${file}`);
    } catch (error) {
      console.error(`✗ Failed to download ${file}:`, error.message);
    }
  }

  console.log('FFmpeg download complete!');
}

downloadFFmpegFiles(); 