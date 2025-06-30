/**
 * Anemoia Inpainting Worker
 *
 * This worker handles the inpainting process using the LaMa ONNX model.
 * It takes an image and a mask as input and returns the inpainted image.
 * This is a simplified, single-model implementation.
 */
import * as ort from 'onnxruntime-web';

// --- Interfaces ---
interface InpaintingRequest {
  command: 'initialize' | 'process';
  imageData?: ImageData;
  maskData?: ImageData;
}

interface PerformanceStats {
  preprocessTime: number;
  inferenceTime: number;
  postprocessTime: number;
  totalTime: number;
  modelUsed: string;
  acceleration: string;
}

// --- Worker State ---
let session: ort.InferenceSession | null = null;
let isInitialized = false;
const modelUrl = '/models/lama_fp32.onnx'; // This model will be added to the public/models directory

// --- Main Message Handler ---
self.onmessage = async (event: MessageEvent<InpaintingRequest>) => {
  const { command } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await initialize();
        break;
      case 'process':
        if (event.data.imageData && event.data.maskData) {
          await process(event.data.imageData, event.data.maskData);
        } else {
          throw new Error('Process command requires imageData and maskData.');
        }
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// --- Initialization ---
async function initialize() {
  if (isInitialized) {
    postMessage({ status: 'initialized', message: 'Worker already initialized.' });
    return;
  }
  
  postMessage({ status: 'initializing', message: 'Initializing worker and loading model...' });

  try {
    ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
    
    // Check if model file exists
    const response = await fetch(modelUrl, { method: 'HEAD' });
    if (!response.ok) {
        throw new Error(`Inpainting model not found at ${modelUrl}. Please make sure it's in the public/models directory.`);
    }

    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['webgl'], // Use WebGL for GPU acceleration
      graphOptimizationLevel: 'all',
    });

    isInitialized = true;
    postMessage({ status: 'initialized', message: 'Inpainting worker is ready.' });
    } catch (error) {
    isInitialized = false; // Ensure we can retry initialization
    throw new Error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- Processing ---
async function process(imageData: ImageData, maskData: ImageData) {
  if (!session) {
    throw new Error('Session not initialized. Please initialize the worker first.');
  }

  const startTime = performance.now();
  postMessage({ status: 'processing', progress: 0, message: 'Starting inpainting...' });

  try {
    const preprocessStart = performance.now();
    const { imageTensor, maskTensor } = await preprocess(imageData, maskData);
    const preprocessTime = performance.now() - preprocessStart;
    
    postMessage({ status: 'processing', progress: 30, message: 'Running AI model...' });
    
    const inferenceStart = performance.now();
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = imageTensor;
    feeds[session.inputNames[1]] = maskTensor;

    const outputMap = await session.run(feeds);
    const outputTensor = outputMap[session.outputNames[0]];
    const inferenceTime = performance.now() - inferenceStart;

    postMessage({ status: 'processing', progress: 80, message: 'Finalizing result...' });

    const postprocessStart = performance.now();
    const resultImageData = await postprocess(outputTensor, imageData);
    const postprocessTime = performance.now() - postprocessStart;

    const totalTime = performance.now() - startTime;
    const performanceStats: PerformanceStats = {
      preprocessTime,
      inferenceTime,
      postprocessTime,
      totalTime,
      modelUsed: 'LaMa FP32',
      acceleration: 'WebGL',
    };

             postMessage({
      status: 'complete',
      resultImageData,
      performanceStats,
      progress: 100,
    }, [resultImageData.data.buffer]); // Transferable object
    
  } catch (error) {
    throw new Error(`Processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- Pre-processing ---
async function preprocess(image: ImageData, mask: ImageData): Promise<{ imageTensor: ort.Tensor, maskTensor: ort.Tensor }> {
  const targetSize = 512;

  // Resize image and mask to 512x512
  const resizedImage = resizeImageData(image, targetSize, targetSize);
  const resizedMask = resizeImageData(mask, targetSize, targetSize, true); // Use nearest-neighbor for mask

  // Create Float32Arrays for tensor data
  const imageArray = new Float32Array(3 * targetSize * targetSize);
  const maskArray = new Float32Array(1 * targetSize * targetSize);

  for (let i = 0; i < targetSize * targetSize; i++) {
    // Image data (normalize to [0, 1])
    imageArray[i] = resizedImage.data[i * 4] / 255.0;
    imageArray[i + targetSize * targetSize] = resizedImage.data[i * 4 + 1] / 255.0;
    imageArray[i + 2 * targetSize * targetSize] = resizedImage.data[i * 4 + 2] / 255.0;

    // Mask data (0 for background, 1 for mask)
    maskArray[i] = resizedMask.data[i * 4] > 128 ? 1.0 : 0.0;
  }

  const imageTensor = new ort.Tensor('float32', imageArray, [1, 3, targetSize, targetSize]);
  const maskTensor = new ort.Tensor('float32', maskArray, [1, 1, targetSize, targetSize]);

  return { imageTensor, maskTensor };
}

// --- Post-processing ---
async function postprocess(output: ort.Tensor, originalImage: ImageData): Promise<ImageData> {
    const outputData = output.data as Float32Array;
    const targetSize = 512;

    // Create a temporary canvas for the 512x512 output
    const tempCanvas = new OffscreenCanvas(targetSize, targetSize);
    const tempCtx = tempCanvas.getContext('2d')!;
    const tempImageData = tempCtx.createImageData(targetSize, targetSize);
    
    for (let i = 0; i < targetSize * targetSize; i++) {
        const r = outputData[i] * 255;
        const g = outputData[i + targetSize * targetSize] * 255;
        const b = outputData[i + 2 * targetSize * targetSize] * 255;

        tempImageData.data[i * 4] = Math.max(0, Math.min(255, r));
        tempImageData.data[i * 4 + 1] = Math.max(0, Math.min(255, g));
        tempImageData.data[i * 4 + 2] = Math.max(0, Math.min(255, b));
        tempImageData.data[i * 4 + 3] = 255;
    }
    tempCtx.putImageData(tempImageData, 0, 0);

    // Create a final canvas with the original image dimensions
    const finalCanvas = new OffscreenCanvas(originalImage.width, originalImage.height);
    const finalCtx = finalCanvas.getContext('2d')!;
    
    // Draw the original image first
    finalCtx.putImageData(originalImage, 0, 0);
    
    // Draw the upscaled inpainted result on top
    finalCtx.drawImage(tempCanvas, 0, 0, originalImage.width, originalImage.height);

    return finalCtx.getImageData(0, 0, originalImage.width, originalImage.height);
}

// --- Utility Functions ---
function resizeImageData(input: ImageData, width: number, height: number, nearestNeighbor = false): ImageData {
  const inputCanvas = new OffscreenCanvas(input.width, input.height);
  const inputCtx = inputCanvas.getContext('2d')!;
  inputCtx.putImageData(input, 0, 0);

  const outputCanvas = new OffscreenCanvas(width, height);
  const outputCtx = outputCanvas.getContext('2d')!;
  
  if (nearestNeighbor) {
      outputCtx.imageSmoothingEnabled = false;
  }
  
  outputCtx.drawImage(inputCanvas, 0, 0, width, height);
  return outputCtx.getImageData(0, 0, width, height);
} 