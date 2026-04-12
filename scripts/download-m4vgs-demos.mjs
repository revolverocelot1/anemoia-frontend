import fs from 'fs';
import path from 'path';
import https from 'https';

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'm4vgs', 'demos', 'manifest.json');
const DEMOS_DIR = path.join(process.cwd(), 'public', 'm4vgs', 'demos');

if (!fs.existsSync(DEMOS_DIR)) {
  fs.mkdirSync(DEMOS_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found at:', MANIFEST_PATH);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`Found ${manifest.models.length} models in manifest.`);

  // We explicitly define the Github CDN fallback paths here instead of putting them into the manifest natively
  // to perfectly preserve the manifest's structural integrity for pure local static-path hosting routes.
  const remoteSources = {
    "/demos/GOT tywin short.m4vgs": "https://github.com/revolverocelot1/m4vgs-demo-assets/releases/download/v1.0.0/GOT.tywin.short.m4vgs",
    "/demos/result (11).m4vgs": "https://github.com/revolverocelot1/m4vgs-demo-assets/releases/download/v1.0.0/result.11.m4vgs",
    "/demos/result (12).m4vgs": "https://github.com/revolverocelot1/m4vgs-demo-assets/releases/download/v1.0.0/result.12.m4vgs",
    "/demos/result (31).m4vgs": "https://github.com/revolverocelot1/m4vgs-demo-assets/releases/download/v1.0.0/result.31.m4vgs"
  };

  for (const model of manifest.models) {
    const fileName = path.basename(model.file);
    const localPath = path.join(DEMOS_DIR, fileName);
    
    // Skip if it physically dynamically exists on the host machine already (e.g. localhost)
    if (fs.existsSync(localPath)) {
      console.log(`[Cache Hit] Demo organically found perfectly locally: ${fileName}`);
      continue;
    }

    const remoteUrl = remoteSources[model.file];
    if (remoteUrl) {
      console.log(`[Network Fetch] Downloading massive remote demo dynamically: ${fileName}...`);
      try {
        await downloadFile(remoteUrl, localPath);
        console.log(`[Success] Perfect pull natively saved: ${fileName}`);
      } catch (err) {
        console.error(`[Error] Stream pipeline failure dynamically fetching ${fileName}:`, err);
      }
    }
  }
}

run();
