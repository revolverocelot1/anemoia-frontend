import pixelmatch from 'pixelmatch';
import ssim from 'ssim.js';
import { createScheduler, createWorker } from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';

// A dedicated worker for handling the intensive image comparison tasks.

// --- 1. SCRIPT LOADING & INITIALIZATION ---

// Use importScripts to load external libraries. This is the standard way for web workers.
// It helps avoid polluting the global scope of the main application and fixes "module is not defined" errors.
// try {
//   importScripts(
//     'https://cdn.jsdelivr.net/npm/pixelmatch@5.3.0/index.js',
//     'https://unpkg.com/ssim.js@3.5.0/dist/ssim.web.js',
//     'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
//     'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js',
//     // OpenCV is powerful but large. We'll load it on demand if needed for complex alignment.
//     // 'https://docs.opencv.org/4.x/opencv.js' 
//   );
// } catch (e) {
//   console.error('Worker Script Loading Error:', e);
//   // Inform the main thread that initialization failed.
//   self.postMessage({ type: 'error', payload: 'Could not load analysis libraries.' });
// }

// Declare the global variables. The @ts-ignore is used because TypeScript struggles 
// to reconcile the types for scripts loaded globally in a worker context.
// @ts-ignore
// declare const pixelmatch: any, ssim: any, Tesseract: any, tf: any;
// declare const cv: any;

// --- 2. MAIN MESSAGE HANDLER ---

self.onmessage = async (event) => {
  const { image1: image1blobUrl, image2: image2blobUrl, settings } = event.data;

  try {
    self.postMessage({ type: 'progress', payload: { message: 'Fetching images...' } });

    // Fetch and decode images simultaneously.
    const [image1, image2] = await Promise.all([
      fetch(image1blobUrl).then(res => res.blob()).then(createImageBitmap),
      fetch(image2blobUrl).then(res => res.blob()).then(createImageBitmap)
    ]);

    // Ensure images have the same dimensions for comparison.
    let image2ToCompare = image2;
    if (image1.width !== image2.width || image1.height !== image2.height) {
      self.postMessage({ type: 'progress', payload: { message: 'Resizing images to match...' } });
      const canvas = new OffscreenCanvas(image1.width, image1.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image2, 0, 0, image1.width, image1.height);
        image2ToCompare = await createImageBitmap(canvas);
      } else {
        throw new Error('Could not get 2D context to resize image.');
      }
    }

    // --- 3. ANALYSIS TASKS ---
    
    const results: any = {
      stats: {},
      annotations: null,
      ocr: null,
      classification: null,
    };

    const analysisPromises = [];

    // ** A. Annotation and Stats Calculation **
    if (settings.enableAnnotations) {
      analysisPromises.push((async () => {
        self.postMessage({ type: 'progress', payload: { message: 'Analyzing differences...' } });
        const { stats, diffImageData, differences } = performPixelAnalysis(image1, image2ToCompare);
        results.stats = { ...results.stats, ...stats };
        results.annotations = { diffImageData, differences };
      })());
    }

    // ** B. OCR Task **
    if (settings.enableOcr) {
      analysisPromises.push((async () => {
        self.postMessage({ type: 'progress', payload: { message: 'Performing OCR...' } });
        results.ocr = await performOcr(image1blobUrl, image2blobUrl);
      })());
    }

    // ** C. Classification Task **
    if (settings.enableClassification) {
      analysisPromises.push((async () => {
        self.postMessage({ type: 'progress', payload: { message: 'Classifying images...' } });
        results.classification = await performClassification(image1, image2ToCompare);
      })());
    }

    await Promise.all(analysisPromises);

    self.postMessage({ type: 'results', payload: results });

  } catch (error: any) {
    console.error('Worker processing failed:', error);
    self.postMessage({ type: 'error', payload: error.message || 'An unknown error occurred during analysis.' });
  }
};


// --- 4. IMAGE ANALYSIS FUNCTIONS ---

/**
 * Performs pixel-level analysis using pixelmatch and calculates advanced stats.
 */
function performPixelAnalysis(image1: ImageBitmap, image2: ImageBitmap) {
    const { width, height } = image1;
    
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // Get image data for both images
    ctx.drawImage(image1, 0, 0);
    const img1Data = ctx.getImageData(0, 0, width, height);
    
    ctx.drawImage(image2, 0, 0);
    const img2Data = ctx.getImageData(0, 0, width, height);

    const diffImageData = new ImageData(width, height);

    // Run Pixelmatch
    const mismatchedPixels = pixelmatch(img1Data.data, img2Data.data, diffImageData.data, width, height, {
        threshold: 0.2, // Increased threshold to reduce noise from compression artifacts
        includeAA: true,
    });

    // Run Bounding Box detection on the diff
    const differences = findDifferenceRegions(diffImageData, 20, 20); // Ignore regions smaller than 20 pixels in area

    // Calculate advanced stats
    const mse = calculateMse(img1Data.data, img2Data.data);
    const ssimResult = ssim(img1Data, img2Data, { k1: 0.01, k2: 0.03, bitDepth: 8, windowSize: 8 }).mssim;

    return {
        stats: {
            mismatchedPixels,
            differencesFound: differences.length,
            mse,
            ssim: ssimResult,
            imageWidth: width,
            imageHeight: height,
        },
        diffImageData,
        differences
    };
}

/**
 * Finds and analyzes contiguous regions of differences from a pixelmatch diff image.
 * Uses a connected-component labeling algorithm (flood fill).
 * @param diffImageData The raw image data from pixelmatch.
 * @param maxRegions The maximum number of regions to return, sorted by size.
 * @returns An array of difference objects.
 */
function findDifferenceRegions(diffImageData: ImageData, maxRegions: number, minArea: number) {
    const { width, height, data } = diffImageData;
    const visited = new Uint8Array(width * height);
    const regions = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x);
            if (visited[index]) continue;

            // Check if the pixel is part of a difference (pixelmatch marks diffs in red)
            const R = data[index * 4];
            if (R > 100) { // It's a diff pixel
                const region = {
                    id: 0,
                    x: x,
                    y: y,
                    maxX: x,
                    maxY: y,
                    area: 0,
                };
                
                const queue = [[x, y]];
                visited[index] = 1;

                while (queue.length > 0) {
                    const [cx, cy] = queue.shift()!;
                    
                    region.x = Math.min(region.x, cx);
                    region.y = Math.min(region.y, cy);
                    region.maxX = Math.max(region.maxX, cx);
                    region.maxY = Math.max(region.maxY, cy);
                    region.area++;
                    
                    // Check neighbors (4-connectivity)
                    [[cx, cy - 1], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy]].forEach(([nx, ny]) => {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIndex = ny * width + nx;
                            if (!visited[nIndex] && data[nIndex * 4] > 100) {
                                visited[nIndex] = 1;
                                queue.push([nx, ny]);
                            }
                        }
                    });
                }
                if (region.area >= minArea) {
                  regions.push({
                      ...region,
                      w: region.maxX - region.x + 1,
                      h: region.maxY - region.y + 1,
                  });
                }
            }
        }
    }

    // Sort by largest area and assign IDs
    return regions
        .sort((a, b) => b.area - a.area)
        .slice(0, maxRegions)
        .map((r, i) => ({ ...r, id: i + 1 }));
}


/**
 * Calculates the Mean Squared Error between two images.
 */
function calculateMse(data1: Uint8ClampedArray, data2: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < data1.length; i += 4) {
        const r = data1[i] - data2[i];
        const g = data1[i + 1] - data2[i + 1];
        const b = data1[i + 2] - data2[i + 2];
        sum += r * r + g * g + b * b;
    }
    return sum / (data1.length / 4 * 3);
}

/**
 * Performs OCR on both images using Tesseract.js
 */
async function performOcr(image1Url: string, image2Url: string) {
    const scheduler = createScheduler();
    const worker1 = await createWorker('eng');
    const worker2 = await createWorker('eng');
    
    // Set parameters directly on the workers
    await worker1.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    });
    await worker2.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    });

    scheduler.addWorker(worker1);
    scheduler.addWorker(worker2);

    // Preprocess and recognize
    const results = (await Promise.all([
        scheduler.addJob('recognize', await preprocessImageForOcr(image1Url)),
        scheduler.addJob('recognize', await preprocessImageForOcr(image2Url))
    ])) as unknown as { data: { text: string } }[];
    
    await scheduler.terminate();

    return {
        image1: results[0].data.text,
        image2: results[1].data.text,
    };
}

/**
 * Pre-processes an image to improve OCR accuracy.
 * Converts to grayscale and increases contrast.
 */
async function preprocessImageForOcr(imageUrl: string): Promise<string> {
  const image = await fetch(imageUrl).then(res => res.blob()).then(createImageBitmap);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not create canvas context for OCR preprocessing.');
  }

  ctx.drawImage(image, 0, 0);
  
  // Convert to grayscale and increase contrast for better OCR
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
  }
  ctx.putImageData(imageData, 0, 0);
  
  // Tesseract works best with a direct data URL of the processed image
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}


/**
 * Performs image classification using TensorFlow.js and a pre-trained EfficientNet model.
 */
async function performClassification(image1: ImageBitmap, image2: ImageBitmap): Promise<{ image1: any[], image2: any[] }> {
    self.postMessage({ type: 'progress', payload: { message: 'Loading classification model...' } });
    
    // Load the model from our locally hosted files
    const modelUrl = '/models/efficientnet/model.json';
    const [model, labels] = await Promise.all([
      tf.loadGraphModel(modelUrl) as Promise<tf.GraphModel>,
      fetch('/models/efficientnet/imagenet_class_index.json').then(res => res.json())
    ]);

    const canvas = new OffscreenCanvas(224, 224);
    const ctx = canvas.getContext('2d')!;

    const classify = async (image: ImageBitmap) => {
        // Draw the image to the canvas, which is the expected input type for fromPixels
        ctx.drawImage(image, 0, 0, 224, 224);
        const imageData = ctx.getImageData(0, 0, 224, 224);
        
        const tensor = tf.browser.fromPixels(imageData)
            .expandDims(0)
            .toFloat()
            .div(255); // Normalize to [0, 1]

        const predictions = model.predict(tensor) as tf.Tensor;
        const topK = await predictions.topk(3); // Get top 3 predictions
        
        const indices = await topK.indices.data();
        const values = await topK.values.data();

        // Manually dispose of tensors
        tensor.dispose();
        predictions.dispose();
        topK.indices.dispose();
        topK.values.dispose();

        return Array.from(indices).map((index: any, i: number) => ({
            className: labels[String(index)][1], // Look up the human-readable name
            probability: values[i],
        }));
    };

    self.postMessage({ type: 'progress', payload: { message: 'Classifying Image 1...' } });
    const classification1 = await classify(image1);
    
    self.postMessage({ type: 'progress', payload: { message: 'Classifying Image 2...' } });
    const classification2 = await classify(image2);

    // Dispose the model to free memory
    // @ts-ignore - This is a persistent issue with the TF.js types in a worker environment.
    (model as any).dispose();

    return {
        image1: classification1,
        image2: classification2,
    };
} 