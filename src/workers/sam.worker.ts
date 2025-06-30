/**
 * Anemoia SAM Worker (Pipeline Version)
 *
 * This worker handles segmenting an image based on point prompts
 * using the SlimSAM model via the Transformers.js pipeline API.
 * This is a more robust and simpler approach.
 */

import { pipeline, RawImage, Tensor } from '@huggingface/transformers';

// --- Interfaces ---
interface SAMRequest {
  command: 'initialize' | 'segment';
  imageUrl?: string;
  inputPoints?: { x: number; y: number; }[][]; // Array of point sets
}

// The output from a mask-generation pipeline
interface MaskGenerationOutput {
    masks: RawImage[];
    scores: Tensor; // This is actually a Tensor
}

// --- Worker State ---
let generator: any = null; // We use 'any' here to avoid type issues with the pipeline function
let isInitialized = false;
const modelId = 'Xenova/quantized-mobile-sam';

// --- Main Message Handler ---
self.onmessage = async (event: MessageEvent<SAMRequest>) => {
  const { command } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await initialize();
        break;
      case 'segment':
        if (event.data.imageUrl && event.data.inputPoints) {
          await segment(event.data.imageUrl, event.data.inputPoints);
        } else {
          throw new Error('Segment command requires imageUrl and inputPoints.');
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
    postMessage({ status: 'initialized', message: 'SAM worker already initialized.' });
    return;
  }
  
  postMessage({ status: 'initializing', message: 'Initializing SAM... This may take a moment.' });

  try {
    generator = await pipeline('mask-generation' as any, modelId, {
        progress_callback: (progress: any) => {
            postMessage({ status: 'initializing', message: `Loading model... (${Math.round(progress.progress)}%)` });
        }
    });
    isInitialized = true;
    postMessage({ status: 'initialized', message: 'SAM is ready.' });
  } catch (error) {
    isInitialized = false;
    throw new Error(`SAM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- Segmentation ---
async function segment(imageUrl: string, inputPoints: {x:number, y:number}[][]) {
  if (!generator) {
    throw new Error('SAM not initialized. Please initialize the worker first.');
  }

  postMessage({ status: 'processing', message: 'Running segmentation...' });

  try {
    // The pipeline returns an object with masks and scores
    const outputs: MaskGenerationOutput = await generator(imageUrl, {
        points_per_batch: 64,
        input_points: inputPoints.map(pointSet => pointSet.map(p => [p.x, p.y]))
    });

    if (!outputs.masks || outputs.masks.length === 0) {
        throw new Error('No masks were generated.');
    }
    
    // The scores are in a Tensor, find the index of the highest score
    const scoresData = outputs.scores.data as Float32Array;
    let bestIndex = 0;
    for (let i = 1; i < scoresData.length; i++) {
        if (scoresData[i] > scoresData[bestIndex]) {
            bestIndex = i;
        }
    }
    
    // Select the best mask based on the score
    const bestMask = outputs.masks[bestIndex];

    // The mask is a RawImage. To manipulate it, we convert it to a tensor,
    // multiply by 255 to make it visible, and then create a new RawImage.
    const tensor = await bestMask.toTensor();
    const visibleTensor = tensor.mul(255);
    const maskImage = RawImage.fromTensor(visibleTensor);
    
    // Convert to ImageData to send back to the main thread
    const maskImageData = new ImageData(
      new Uint8ClampedArray(maskImage.data),
      maskImage.width,
      maskImage.height
    );

    postMessage({
      status: 'complete',
      maskImageData,
    }, [maskImageData.data.buffer]);

  } catch (error) {
    throw new Error(`Segmentation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
} 