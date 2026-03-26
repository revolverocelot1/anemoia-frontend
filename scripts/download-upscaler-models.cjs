/**
 * download-upscaler-models.cjs
 *
 * Downloads TF.js model files for the AI Image Upscaler.
 * Uses disk-based streaming to avoid Render's 512MB RAM limits crashing the build.
 * Extracts using native OS tools (unzip on Linux/Mac, tar on Windows).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const RELEASE_URL = 'https://github.com/xororz/web-realesrgan/releases/download/v0.1.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TILE_SIZE = 64;

const NEEDED = [
  { zip: 'realcugan.zip', dirs: [`realcugan/2x-conservative-${TILE_SIZE}`, `realcugan/4x-conservative-${TILE_SIZE}`] },
  { zip: 'realesrgan.zip', dirs: [`realesrgan/anime_plus-${TILE_SIZE}`, `realesrgan/general_plus-${TILE_SIZE}`] },
];

/** Stream download to a file on disk */
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'anemoia-model-dl' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location); // follow redirect
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => reject(new Error(`HTTP ${res.statusCode} for ${u}`)));
          return;
        }
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => reject(err));
      });
    };
    
    get(url);
  });
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  
  try {
    if (process.platform === 'win32') {
      // Windows 10+ has tar built-in which can extract zips
      execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'inherit' });
    } else {
      // Linux/Mac use unzip
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
    }
  } catch (err) {
    throw new Error(`Extraction failed. On Windows ensure Windows 10+, on Linux ensure 'unzip' is installed.\nOriginal error: ${err.message}`);
  }
}

function allPresent() {
  return NEEDED.every(({ dirs }) =>
    dirs.every((d) => fs.existsSync(path.join(PUBLIC_DIR, d, 'model.json')))
  );
}

async function main() {
  if (allPresent()) {
    console.log('✓ All upscaler models already present — skipping download.');
    return;
  }

  const TMP_DIR = path.join(__dirname, '..', 'tmp_models');
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  for (const { zip, dirs } of NEEDED) {
    const missing = dirs.filter((d) => !fs.existsSync(path.join(PUBLIC_DIR, d, 'model.json')));
    if (missing.length === 0) continue;

    const url = `${RELEASE_URL}/${zip}`;
    const zipPath = path.join(TMP_DIR, zip);
    
    console.log(`⬇  Downloading ${zip} to disk...`);
    await downloadToFile(url, zipPath);
    
    console.log(`📦 Extracting ${zip}...`);
    extractZip(zipPath, PUBLIC_DIR);
    
    // Clean up zip
    fs.unlinkSync(zipPath);
    console.log(`✓ Completed ${zip}`);
  }

  // Clean up tmp dir
  try { fs.rmdirSync(TMP_DIR); } catch (e) {}
  
  console.log('✨ All upscaler models installed successfully!');
}

main().catch((err) => {
  console.error('⚠ Failed to download upscaler models:');
  console.error(err);
  console.error('  Models will be unavailable on the site. Please verify the build environment.');
  process.exit(1); // Fail the build so Render accurately reports the failure!
});
