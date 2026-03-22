const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RELEASE_URL = 'https://github.com/xororz/web-realesrgan/releases/download/v0.1.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TILE_SIZE = 64;

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
      execSync(`unzip -o "${zipPath}" "${extract}/*" -d "${PUBLIC_DIR}"`, { stdio: 'inherit' });
    }
  }

  // Clean up temp
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('Upscaler models ready!');
}

main().catch((err) => {
  console.error('Failed to download upscaler models:', err.message);
  process.exit(1);
});
