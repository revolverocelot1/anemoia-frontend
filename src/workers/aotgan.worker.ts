/*
  MI-GAN Inpainting Worker
  ------------------------
  This worker uses a lightweight, web-optimized ONNX model for image inpainting.
  It's designed to be simple and reliable, running directly in the browser.
*/
import * as ort from 'onnxruntime-web';

// --- Configuration ---
const MODEL_URL = '/models/migan_512_places2_pipeline.onnx';

// --- Types ---
interface WorkerMessage {
  imageData: ImageData;
  maskData: ImageData;
}

// --- ONNX Session Management ---
let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (session) {
    return session;
  }
  
  self.postMessage({ status: 'loading', message: 'Downloading model (~8MB)...' });
  
  // Use WebAssembly backend for maximum compatibility
  const options: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
  };
  
  session = await ort.InferenceSession.create(MODEL_URL, options);
  self.postMessage({ status: 'ready', message: 'MI-GAN Inpainting Ready' });
  return session;
}

// --- Main Worker Logic ---
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { imageData, maskData } = e.data;
  
  try {
    const currentSession = await getSession();
    
    self.postMessage({ status: 'processing', message: 'Preparing image tensors...' });

    // Prepare inputs: image and mask tensors
    const imageTensor = imageToTensor(imageData);
    const maskTensor = maskToTensor(maskData);

    const feeds: Record<string, ort.Tensor> = {
      'image': imageTensor,
      'mask': maskTensor,
    };

    self.postMessage({ status: 'processing', message: 'Running MI-GAN inference...' });
    
    // Run model inference
    const results = await currentSession.run(feeds);
    const outputTensor = results.output;
    
    self.postMessage({ status: 'processing', message: 'Finalizing image...' });
    
    // Convert the output tensor back to ImageData
    const resultImageData = tensorToImageData(outputTensor, imageData.width, imageData.height);

    self.postMessage({
      status: 'complete',
      resultImageData,
    }, [resultImageData.data.buffer]); // Transfer buffer to avoid copying

  } catch (error) {
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};

// --- Helper Functions ---

// Convert ImageData to a Float32 tensor (CHW format, values 0-255)
function imageToTensor(data: ImageData): ort.Tensor {
  const { width, height } = data;
  const floatData = new Float32Array(3 * width * height);
  for (let i = 0, j = 0; i < data.data.length; i += 4, j++) {
    floatData[j] = data.data[i];
    floatData[j + width * height] = data.data[i + 1];
    floatData[j + 2 * width * height] = data.data[i + 2];
  }
  return new ort.Tensor('float32', floatData, [1, 3, height, width]);
}

// Convert mask ImageData to a Float32 tensor (CHW format, values 0 or 1)
function maskToTensor(mask: ImageData): ort.Tensor {
  const { width, height } = mask;
  const floatData = new Float32Array(width * height);
  for (let i = 0, j = 0; i < mask.data.length; i += 4, j++) {
    floatData[j] = mask.data[i] > 128 ? 1.0 : 0.0;
  }
  return new ort.Tensor('float32', floatData, [1, 1, height, width]);
}

// Convert an output tensor to ImageData
function tensorToImageData(tensor: ort.Tensor, width: number, height: number): ImageData {
  const outputData = tensor.data as Float32Array;
  const imageData = new ImageData(width, height);
  for (let i = 0, j = 0; i < outputData.length; i += 3, j += 4) {
    imageData.data[j] = Math.max(0, Math.min(255, outputData[i]));
    imageData.data[j + 1] = Math.max(0, Math.min(255, outputData[i + 1]));
    imageData.data[j + 2] = Math.max(0, Math.min(255, outputData[i + 2]));
    imageData.data[j + 3] = 255;
  }
  return imageData;
}