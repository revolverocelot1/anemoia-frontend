/**
 * Batch ZIP Exporter for Gemini Watermark Remover
 * Uses fflate for instantaneous, in-memory compression without freezing the browser.
 */

import { zipSync, Zippable } from 'fflate';
export interface ProcessedMediaItem {
  file: File;
  name: string;
  cleanedBlob: Blob;
  detected: boolean;
  processingTimeMs: number;
  originalUrl?: string;
  cleanedUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  totalFrames?: number;
  detectionMeta?: any;
}

/**
 * Downloads a single Blob with a given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function getBlobBuffer(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  if (typeof Response !== 'undefined') {
    return new Uint8Array(await new Response(blob).arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Creates an in-memory ZIP blob from an array of processed items.
 */
export async function createBatchZipBlob(items: ProcessedMediaItem[]): Promise<Blob> {
  const zippable: Zippable = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const buffer = await getBlobBuffer(item.cleanedBlob);
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const ext = item.cleanedBlob.type.includes('video')
      ? 'mp4'
      : item.cleanedBlob.type.includes('jpeg')
      ? 'jpg'
      : item.cleanedBlob.type.includes('webp')
      ? 'webp'
      : 'png';

    const filename = `${baseName}_clean.${ext}`;
    zippable[filename] = buffer;
  }

  const zippedBytes = zipSync(zippable, { level: 0 }); // level 0 is fastest (store only, media is already compressed)
  return new Blob([zippedBytes], { type: 'application/zip' });
}

/**
 * Zips an array of processed items and initiates an instant browser download.
 */
export async function downloadBatchZip(
  items: ProcessedMediaItem[],
  zipFilename = 'anemoia-watermark-removed.zip'
): Promise<void> {
  if (!items || items.length === 0) return;
  const zipBlob = await createBatchZipBlob(items);
  downloadBlob(zipBlob, zipFilename);
}
