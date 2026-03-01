const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const https = require('https');
const http = require('http');

const RELEASE_URL = 'https://github.com/xororz/web-realesrgan/releases/download/v0.1.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TILE_SIZE = 64;
const IS_WINDOWS = process.platform === 'win32';

const NEEDED_DIRS = [
  { zip: 'realcugan.zip', extract: `realcugan/2x-conservative-${TILE_SIZE}` },
  { zip: 'realcugan.zip', extract: `realcugan/4x-conservative-${TILE_SIZE}` },
  { zip: 'realesrgan.zip', extract: `realesrgan/anime_plus-${TILE_SIZE}` },
  { zip: 'realesrgan.zip', extract: `realesrgan/general_plus-${TILE_SIZE}` },
];

function allModelsPresent() {
  return NEEDED_DIRS.every(({ extract }) => {
    const modelJson = path.join(PUBLIC_DIR, extract, 'model.json');
    return fs.existsSync(modelJson);
  });
}

/**
 * Extract a zip file. Uses PowerShell on Windows, unzip on Unix.
 */
function extractZip(zipPath, destDir, extractPattern) {
  if (IS_WINDOWS) {
    // On Windows, extract the full zip to a temp location then copy needed dirs
    const extractTmp = zipPath + '-extract';
    if (!fs.existsSync(extractTmp)) {
      console.log(`  Expanding archive (PowerShell)...`);
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTmp}' -Force"`,
        { stdio: 'inherit' }
      );
    }
    // Copy the specific directory we need
    const srcDir = path.join(extractTmp, extractPattern);
    const dstDir = path.join(destDir, extractPattern);
    if (fs.existsSync(srcDir)) {
      fs.mkdirSync(path.dirname(dstDir), { recursive: true });
      copyDirSync(srcDir, dstDir);
    } else {
      throw new Error(`Expected directory not found in archive: ${srcDir}`);
    }
  } else {
    execSync(`unzip -o "${zipPath}" "${extractPattern}/*" -d "${destDir}"`, { stdio: 'inherit' });
  }
}

/** Recursively copy a directory */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  if (allModelsPresent()) {
    console.log('All upscaler models already present – skipping download.');
    return;
  }

  const tmpDir = path.join(__dirname, '..', '.tmp-models');
  fs.mkdirSync(tmpDir, { recursive: true });

  const zipsNeeded = [...new Set(NEEDED_DIRS.filter(({ extract }) => {
    return !fs.existsSync(path.join(PUBLIC_DIR, extract, 'model.json'));
  }).map(d => d.zip))];

  for (const zipName of zipsNeeded) {
    const zipPath = path.join(tmpDir, zipName);

    if (!fs.existsSync(zipPath)) {
      const url = `${RELEASE_URL}/${zipName}`;
      console.log(`Downloading ${zipName}...`);
      execSync(`curl -L -o "${zipPath}" "${url}"`, { stdio: 'inherit' });
    }

    const entries = NEEDED_DIRS.filter(d => d.zip === zipName);
    for (const { extract } of entries) {
      const destDir = path.join(PUBLIC_DIR, extract);
      if (fs.existsSync(path.join(destDir, 'model.json'))) continue;
      console.log(`Extracting ${extract}...`);
      fs.mkdirSync(path.join(PUBLIC_DIR, path.dirname(extract)), { recursive: true });
      extractZip(zipPath, PUBLIC_DIR, extract);
    }
  }

  // Clean up temp (including any -extract dirs)
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('Upscaler models ready!');
}

main().catch((err) => {
  console.error('Failed to download upscaler models:', err.message);
  process.exit(1);
});
