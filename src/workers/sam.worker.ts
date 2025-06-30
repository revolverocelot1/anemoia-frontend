/**
 * Anemoia SAM Worker (SlimSAM Version)
 *
 * This worker handles segmenting an image based on point prompts
 * using the SlimSAM model with the correct transformers.js API.
 */

import { SamModel, AutoProcessor, RawImage } from '@huggingface/transformers';

// --- Interfaces ---
interface SAMRequest {
  command: 'initialize' | 'segment';
  imageUrl?: string;
  imageData?: ImageData;
  inputPoints?: { x: number; y: number; }[];
}

// --- Worker State ---
let model: any = null; // Use any to avoid type issues
let processor: any = null; // Use any to avoid type issues
let isInitialized = false;

// Use the smaller SlimSAM model that's proven to work
const modelId = 'Xenova/slimsam-77-uniform';

// --- Main Message Handler ---
self.onmessage = async (event: MessageEvent<SAMRequest>) => {
  const { command } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await initialize();
        break;
      case 'segment':
        if (event.data.imageData && event.data.inputPoints) {
          await segment(event.data.imageData, event.data.inputPoints);
        } else if (event.data.imageUrl && event.data.inputPoints) {
          await segmentFromUrl(event.data.imageUrl, event.data.inputPoints);
        } else {
          throw new Error('Missing required data for segmentation');
        }
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// --- Initialize Function ---
async function initialize(): Promise<void> {
  try {
    self.postMessage({ status: 'loading', message: 'Initializing SAM model...' });

    // Load model and processor using the correct API
    model = await SamModel.from_pretrained(modelId, {
      progress_callback: (progress: any) => {
        self.postMessage({ 
          status: 'loading', 
          message: `Loading model... ${Math.round(progress.progress * 100)}%` 
        });
      }
    });

    processor = await AutoProcessor.from_pretrained(modelId, {});

    isInitialized = true;
    self.postMessage({ 
      status: 'ready', 
      message: 'SAM model initialized successfully',
      modelInfo: {
        model: modelId,
        backend: 'transformers.js'
      }
    });
  } catch (error) {
    throw new Error(`SAM initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// --- Segment from ImageData ---
async function segment(imageData: ImageData, inputPoints: { x: number; y: number; }[]): Promise<void> {
  if (!isInitialized || !model || !processor) {
    throw new Error('SAM model not initialized');
  }

  try {
    self.postMessage({ status: 'processing', message: 'Processing image...' });

    // Convert ImageData to RawImage
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob then to RawImage
    const blob = await canvas.convertToBlob();
    const rawImage = await RawImage.fromBlob(blob);

    // Format input points exactly like the documentation: [[[x, y]]]
    const input_points = [inputPoints.map(p => [p.x, p.y])];
    
    // Process inputs exactly like the documentation
    const inputs = await processor(rawImage, { input_points });
    
    // Run model
    self.postMessage({ status: 'processing', message: 'Running segmentation...' });
    const outputs = await model(inputs);

    // Post-process masks exactly like the documentation
    const masks = await processor.post_process_masks(
      outputs.pred_masks, 
      inputs.original_sizes, 
      inputs.reshaped_input_sizes
    );

    // Get the best mask (highest IoU score)
    const scores = outputs.iou_scores.data as Float32Array;
    let bestIndex = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIndex]) {
        bestIndex = i;
      }
    }

    // Convert mask to ImageData - get the best mask from the first batch
    const bestMask = masks[0][bestIndex];
    const maskImageData = tensorToImageData(bestMask, imageData.width, imageData.height);

    self.postMessage({
      status: 'complete',
      maskImageData,
      scores: Array.from(scores),
      message: 'Segmentation complete'
    });

  } catch (error) {
    throw new Error(`Segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// --- Segment from URL ---
async function segmentFromUrl(imageUrl: string, inputPoints: { x: number; y: number; }[]): Promise<void> {
  if (!isInitialized || !model || !processor) {
    throw new Error('SAM model not initialized');
  }

  try {
    self.postMessage({ status: 'processing', message: 'Loading image...' });

    // Load image exactly like the documentation
    const rawImage = await RawImage.read(imageUrl);
    
    // Format input points exactly like the documentation: [[[x, y]]]
    const input_points = [inputPoints.map(p => [p.x, p.y])];
    
    // Process inputs exactly like the documentation
    const inputs = await processor(rawImage, { input_points });
    
    // Run model
    self.postMessage({ status: 'processing', message: 'Running segmentation...' });
    const outputs = await model(inputs);

    // Post-process masks exactly like the documentation
    const masks = await processor.post_process_masks(
      outputs.pred_masks, 
      inputs.original_sizes, 
      inputs.reshaped_input_sizes
    );

    // Get the best mask (highest IoU score)
    const scores = outputs.iou_scores.data as Float32Array;
    let bestIndex = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIndex]) {
        bestIndex = i;
      }
    }

    // Convert mask to ImageData - get the best mask from the first batch
    const bestMask = masks[0][bestIndex];
    const maskImageData = tensorToImageData(bestMask, rawImage.width, rawImage.height);

    self.postMessage({
      status: 'complete',
      maskImageData,
      scores: Array.from(scores),
      message: 'Segmentation complete'
    });

  } catch (error) {
    throw new Error(`Segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// --- Helper Functions ---
function tensorToImageData(tensor: any, targetWidth: number, targetHeight: number): ImageData {
  const data = tensor.data as Float32Array;
  const [height, width] = tensor.dims.slice(-2);
  
  // Create ImageData
  const imageData = new ImageData(targetWidth, targetHeight);
  
  // Resize mask to target dimensions and convert to RGBA
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Map to mask coordinates
      const maskX = Math.floor((x / targetWidth) * width);
      const maskY = Math.floor((y / targetHeight) * height);
      const maskIndex = maskY * width + maskX;
      
      // Use 255 for true (white), 0 for false (black) - mask is boolean tensor
      const maskValue = data[maskIndex] > 0.5 ? 255 : 0;
      const pixelIndex = (y * targetWidth + x) * 4;
      
      imageData.data[pixelIndex] = maskValue;     // R
      imageData.data[pixelIndex + 1] = maskValue; // G
      imageData.data[pixelIndex + 2] = maskValue; // B
      imageData.data[pixelIndex + 3] = maskValue; // A
    }
  }
  
  return imageData;
} 