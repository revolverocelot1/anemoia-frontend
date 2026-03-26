/**
 * download-upscaler-models.cjs
 *
 * Downloads TF.js model files for the AI Image Upscaler.
 * Cross-platform: uses only Node.js built-in modules (no curl/unzip dependency).
 *
 * Models are downloaded from:
 *   https://github.com/xororz/web-realesrgan/releases/download/v0.1.0/
 *
 * Each model is a zip archive containing one or more directories with:
 *   - model.json   (TF.js GraphModel descriptor)
 *   - group1-shard*.bin  (weight shards)
 *
 * After extraction the layout inside public/ matches what the worker expects:
 *   public/realcugan/2x-conservative-64/model.json
 *   public/realcugan/4x-conservative-64/model.json
 *   public/realesrgan/anime_plus-64/model.json
 *   public/realesrgan/general_plus-64/model.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createInflateRaw } = require('zlib');

const RELEASE_URL = 'https://github.com/xororz/web-realesrgan/releases/download/v0.1.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TILE_SIZE = 64;

const NEEDED = [
  { zip: 'realcugan.zip', dirs: [`realcugan/2x-conservative-${TILE_SIZE}`, `realcugan/4x-conservative-${TILE_SIZE}`] },
  { zip: 'realesrgan.zip', dirs: [`realesrgan/anime_plus-${TILE_SIZE}`, `realesrgan/general_plus-${TILE_SIZE}`] },
];

// ---- helpers ----------------------------------------------------------------

/** Follow redirects (GitHub releases redirect to S3). */
function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'anemoia-model-dl' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);          // follow redirect
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

/**
 * Minimal ZIP reader — extracts files from a ZIP buffer.
 * Only handles Store (0) and Deflate (8) methods, which covers all TF.js model zips.
 */
function extractZip(buf, prefixes) {
  const files = [];
  let offset = 0;

  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;       // not a local file header

    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const rawData = buf.slice(dataStart, dataStart + compSize);
    offset = dataStart + compSize;

    // Skip directories and files we don't need
    if (name.endsWith('/')) continue;
    const matchesPrefix = prefixes.some((p) => name.startsWith(p));
    if (!matchesPrefix) continue;

    files.push({ name, method, rawData, uncompSize });
  }

  return files;
}

function inflate(raw) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const inf = createInflateRaw();
    inf.on('data', (c) => chunks.push(c));
    inf.on('end', () => resolve(Buffer.concat(chunks)));
    inf.on('error', reject);
    inf.end(raw);
  });
}

// ---- main -------------------------------------------------------------------

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

  for (const { zip, dirs } of NEEDED) {
    // Which subdirectories still need extraction?
    const missing = dirs.filter(
      (d) => !fs.existsSync(path.join(PUBLIC_DIR, d, 'model.json'))
    );
    if (missing.length === 0) continue;

    const url = `${RELEASE_URL}/${zip}`;
    console.log(`⬇  Downloading ${zip} (${missing.length} model(s) needed)...`);
    const buf = await download(url);
    console.log(`   Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

    const entries = extractZip(buf, missing);
    console.log(`   Extracting ${entries.length} files...`);

    for (const entry of entries) {
      const dest = path.join(PUBLIC_DIR, entry.name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });

      let data;
      if (entry.method === 0) {
        data = entry.rawData;           // stored (no compression)
      } else if (entry.method === 8) {
        data = await inflate(entry.rawData);  // deflate
      } else {
        console.warn(`   ⚠ Unsupported compression method ${entry.method} for ${entry.name}, skipping`);
        continue;
      }
      fs.writeFileSync(dest, data);
    }

    console.log(`   ✓ Extracted ${zip}`);
  }

  console.log('✓ All upscaler models ready!');
}

main().catch((err) => {
  console.error('⚠ Failed to download upscaler models:', err.message);
  console.error('  Models will be unavailable. Run "npm run download-upscaler-models" manually.');
  // Don't exit(1) — allow build to continue so the app works for other features.
});
