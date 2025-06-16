// src/workers/upscaler.worker.ts - Real-ESRGAN placeholder (simulated upscaling)
// In a real implementation, this would use ONNX.js or similar to run Real-ESRGAN

import * as ort from 'onnxruntime-web';

let ready = false;

// Cache for loaded ONNX sessions keyed by scale factor
const sessions: Record<number, ort.InferenceSession> = {};

// Initialise ORT backend (prefer WebGPU, fallback WASM)
async function initBackend() {
  // Configure preferred EPs (will auto–fallback)
  ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
  // nothing else to do; session creation will trigger backend init
}

async function initModel() {
  if (ready) return;
  
  // Simulate model loading time
  await new Promise(resolve => setTimeout(resolve, 2000));
  ready = true;
}

// Remote Hugging Face repo containing ONNX weights
const HF_BASE = 'https://huggingface.co/USER_OR_ORG/REPO/resolve/main';

async function fetchModel(scale: number): Promise<ArrayBuffer> {
  const resp = await fetch(`${HF_BASE}/realesrgan_x${scale}.onnx`);
  if (!resp.ok) throw new Error('Failed to download model');
  return await resp.arrayBuffer();
}

async function getSession(scale: number) {
  if (sessions[scale]) return sessions[scale];

  self.postMessage({ status: 'loading_model' });
  await initBackend();

  // Download model from Hugging Face and create session from ArrayBuffer (no CORS issues)
  const modelBuf = await fetchModel(scale);

  const opts: ort.InferenceSession.SessionOptions = {
    executionProviders: ['webgpu', 'wasm']
  };
  const session = await ort.InferenceSession.create(modelBuf, opts);
  sessions[scale] = session;

  self.postMessage({ status: 'model_ready' });
  return session;
}

// Upscaling using OffscreenCanvas (works inside WebWorker)
async function upscaleWithOffscreen(imageData: ImageData, scaleFactor: number): Promise<Blob> {
  // Draw original ImageData into an OffscreenCanvas
  const offscreen = new OffscreenCanvas(imageData.width * scaleFactor, imageData.height * scaleFactor);
  const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D;

  // Create bitmap from ImageData so we can draw with imageSmoothing
  const bitmap = await createImageBitmap(imageData);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, offscreen.width, offscreen.height);

  // Convert to PNG Blob
  const blob = await offscreen.convertToBlob({ type: 'image/png' });
  return blob;
}

self.onmessage = async (e) => {
  const { command, imageData, scaleFactor } = e.data;
  if (command !== 'upscale' || !imageData) return;

  try {
    if (!ready) {
      self.postMessage({ status: 'loading_model' });
      await initModel();
      self.postMessage({ status: 'model_ready' });
    }

    self.postMessage({ status: 'processing' });

    // Simulate processing time based on scale factor
    const processingTime = scaleFactor * 1000; // 1-8 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const upscaledBlob = await upscaleWithOffscreen(imageData, scaleFactor);

    self.postMessage({ status: 'complete', upscaledBlob });
  } catch (err: any) {
    self.postMessage({ status: 'error', error: err.message || 'Upscaler worker error' });
  }
}; 