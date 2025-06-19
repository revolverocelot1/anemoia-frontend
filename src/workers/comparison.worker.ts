import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import ssim from 'ssim.js';
import pixelmatch from 'pixelmatch';
import { createScheduler, createWorker } from 'tesseract.js';

let tfBackendInitialized = false;

/**
 * Simple image feature extraction for classification
 */
async function extractImageFeatures(imageBitmap: ImageBitmap): Promise<any> {
    const canvas = new OffscreenCanvas(224, 224);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224);
    
    // Simple feature extraction based on color distribution and patterns
    const data = imageData.data;
    let totalR = 0, totalG = 0, totalB = 0;
    let brightness = 0;
    let contrast = 0;
    let edges = 0;
    
    // Calculate basic statistics
    for (let i = 0; i < data.length; i += 4) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    
    const pixelCount = data.length / 4;
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    brightness /= pixelCount;
    
    // Calculate contrast and edge detection
    for (let i = 0; i < data.length; i += 4) {
        const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        contrast += Math.abs(pixelBrightness - brightness);
        
        // Simple edge detection
        if (i < data.length - 4 * 224) { // Not last row
            const nextRowBrightness = (data[i + 4 * 224] + data[i + 4 * 224 + 1] + data[i + 4 * 224 + 2]) / 3;
            edges += Math.abs(pixelBrightness - nextRowBrightness);
        }
    }
    
    contrast /= pixelCount;
    edges /= pixelCount;
    
    // Classify based on simple heuristics
    const classifications = [];
    
    // Color-based classifications
    if (avgR > avgG && avgR > avgB && avgR > 150) {
        classifications.push({ className: "reddish object/scene", probability: 0.8 });
    } else if (avgG > avgR && avgG > avgB && avgG > 150) {
        classifications.push({ className: "greenish object/scene", probability: 0.8 });
    } else if (avgB > avgR && avgB > avgG && avgB > 150) {
        classifications.push({ className: "bluish object/scene", probability: 0.8 });
    }
    
    // Brightness-based classifications
    if (brightness > 200) {
        classifications.push({ className: "bright/light image", probability: 0.7 });
    } else if (brightness < 50) {
        classifications.push({ className: "dark/night image", probability: 0.7 });
    }
    
    // Contrast-based classifications
    if (contrast > 60) {
        classifications.push({ className: "high contrast image", probability: 0.6 });
    } else if (contrast < 20) {
        classifications.push({ className: "low contrast/smooth image", probability: 0.6 });
    }
    
    // Edge-based classifications
    if (edges > 40) {
        classifications.push({ className: "detailed/textured image", probability: 0.6 });
    } else if (edges < 10) {
        classifications.push({ className: "simple/minimalist image", probability: 0.6 });
    }
    
    // Color combinations
    const isGrayscale = Math.abs(avgR - avgG) < 10 && Math.abs(avgG - avgB) < 10 && Math.abs(avgR - avgB) < 10;
    if (isGrayscale) {
        classifications.push({ className: "grayscale/monochrome", probability: 0.7 });
    }
    
    // Default if no specific classifications
    if (classifications.length === 0) {
        classifications.push({ className: "general image", probability: 0.5 });
    }
    
    // Sort by probability and return top 3
    return classifications.sort((a, b) => b.probability - a.probability).slice(0, 3);
}

/**
 * Calculate MSE (Mean Squared Error) between two images
 */
function calculateMSE(imageData1: ImageData, imageData2: ImageData): number {
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    let mse = 0;
    
    for (let i = 0; i < data1.length; i += 4) {
        // Calculate squared differences for R, G, B channels
        const rDiff = data1[i] - data2[i];
        const gDiff = data1[i + 1] - data2[i + 1];
        const bDiff = data1[i + 2] - data2[i + 2];
        
        mse += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 3;
    }
    
    return mse / (data1.length / 4);
}

/**
 * Find connected components (difference regions) in the diff image
 */
function findDifferenceRegions(diffImageData: ImageData, minArea: number = 50): Array<{ id: number; x: number; y: number; w: number; h: number; area: number; }> {
    const { width, height, data } = diffImageData;
    const visited = new Array(width * height).fill(false);
    const regions = [];
    let regionId = 1;
    
    // Simple flood fill to find connected components
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const pixelIndex = index * 4;
            
            // Check if this pixel has a difference (any RGB channel > 0) and hasn't been visited
            if (!visited[index] && (data[pixelIndex] > 0 || data[pixelIndex + 1] > 0 || data[pixelIndex + 2] > 0)) {
                const region = floodFill(diffImageData, visited, x, y, regionId);
                if (region.area >= minArea) {
                    regions.push(region);
                    regionId++;
                }
            }
        }
    }
    
    return regions;
}

/**
 * Flood fill algorithm to find connected difference regions
 */
function floodFill(imageData: ImageData, visited: boolean[], startX: number, startY: number, id: number) {
    const { width, height, data } = imageData;
    const stack = [{ x: startX, y: startY }];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let area = 0;
    
    while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const index = y * width + x;
        const pixelIndex = index * 4;
        
        if (visited[index]) continue;
        
        // Check if this pixel has a difference
        if (data[pixelIndex] === 0 && data[pixelIndex + 1] === 0 && data[pixelIndex + 2] === 0) continue;
        
        visited[index] = true;
        area++;
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Add neighboring pixels to stack
        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
    }
    
    return {
        id,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        area
    };
}

/**
 * Pre-processes an image for OCR.
 */
async function preprocessOcrImage(imageBitmap: ImageBitmap): Promise<string> {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const contrastedValue = avg < 128 ? avg * 0.8 : avg * 1.2;
        data[i] = contrastedValue;
        data[i + 1] = contrastedValue;
        data[i + 2] = contrastedValue;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob().then(blob => URL.createObjectURL(blob));
}

/**
 * Main message handler for the worker.
 */
self.onmessage = async (event) => {
    // Initialize TF.js backend on first message
    if (!tfBackendInitialized) {
        try {
            await tf.setBackend('wasm');
            console.log('TF.js WASM backend initialized successfully.');
            tfBackendInitialized = true;
        } catch (error) {
            console.error("Failed to set WASM backend:", error);
            self.postMessage({ type: 'error', payload: 'Could not initialize AI backend (WASM). AI features may not work.' });
        }
    }

    const { image1: image1blobUrl, image2: image2blobUrl, settings } = event.data;
    const { enableAnnotations, enableOcr, enableClassification, normalizeAspectRatio } = settings;

    try {
        self.postMessage({ type: 'progress', payload: { message: 'Fetching and decoding images...' } });
        
        const [image1, image2] = await Promise.all([
            fetch(image1blobUrl).then(res => res.blob()).then(createImageBitmap),
            fetch(image2blobUrl).then(res => res.blob()).then(createImageBitmap)
        ]);

        let image2ToCompare = image2;
        const imagesHaveSameDimensions = image1.width === image2.width && image1.height === image2.height;
        let canPerformPixelComparison = imagesHaveSameDimensions;

        if (!imagesHaveSameDimensions && normalizeAspectRatio) {
            self.postMessage({ type: 'progress', payload: { message: 'Normalizing aspect ratio...' } });
            const canvas = new OffscreenCanvas(image1.width, image1.height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get 2D context for resizing.');
            ctx.drawImage(image2, 0, 0, image1.width, image1.height);
            image2ToCompare = await createImageBitmap(canvas);
            canPerformPixelComparison = true;
        }

        const canvas1 = new OffscreenCanvas(image1.width, image1.height);
        const ctx1 = canvas1.getContext('2d')!;
        ctx1.drawImage(image1, 0, 0);
        const imageData1 = ctx1.getImageData(0, 0, image1.width, image1.height);

        const canvas2 = new OffscreenCanvas(image2ToCompare.width, image2ToCompare.height);
        const ctx2 = canvas2.getContext('2d')!;
        ctx2.drawImage(image2ToCompare, 0, 0);
        const imageData2 = ctx2.getImageData(0, 0, image2ToCompare.width, image2ToCompare.height);
        
        // Initialize default values
        let diffImageData: ImageData | null = null;
        let mismatchedPixels: number = 0;
        let ssimValue: number | null = null;
        let mseValue: number | null = null;
        let differencesFound: number = 0;
        let differences: any[] = [];

        if (enableAnnotations) {
            if (canPerformPixelComparison) {
                self.postMessage({ type: 'progress', payload: { message: 'Calculating pixel differences...' } });
                const diff = new ImageData(image1.width, image1.height);
                mismatchedPixels = pixelmatch(imageData1.data, imageData2.data, diff.data, image1.width, image1.height, { threshold: 0.1 });
                diffImageData = diff;

                self.postMessage({ type: 'progress', payload: { message: 'Calculating SSIM...' } });
                try {
                    const ssimResult = ssim(imageData1, imageData2, { k1: 0.01, k2: 0.03, windowSize: 8 });
                    ssimValue = ssimResult.mssim;
                } catch (error) {
                    console.warn('SSIM calculation failed:', error);
                    ssimValue = null;
                }

                self.postMessage({ type: 'progress', payload: { message: 'Calculating MSE...' } });
                try {
                    mseValue = calculateMSE(imageData1, imageData2);
                } catch (error) {
                    console.warn('MSE calculation failed:', error);
                    mseValue = null;
                }

                self.postMessage({ type: 'progress', payload: { message: 'Finding difference regions...' } });
                try {
                    differences = findDifferenceRegions(diff);
                    differencesFound = differences.length;
                } catch (error) {
                    console.warn('Difference region detection failed:', error);
                    differences = [];
                    differencesFound = 0;
                }
            } else {
                 self.postMessage({ type: 'progress', payload: { message: 'Image dimensions do not match. Skipping pixel comparison.' } });
            }
        }
        
        let ocrResult1 = 'N/A';
        let ocrResult2 = 'N/A';
        if (enableOcr) {
            self.postMessage({ type: 'progress', payload: { message: 'Performing OCR...' } });
            try {
                const scheduler = createScheduler();
                const worker1 = await createWorker('eng');
                const worker2 = await createWorker('eng');
                scheduler.addWorker(worker1);
                scheduler.addWorker(worker2);
                
                const [ocr1, ocr2] = await Promise.all([
                    scheduler.addJob('recognize', await preprocessOcrImage(image1)),
                    scheduler.addJob('recognize', await preprocessOcrImage(image2ToCompare))
                ]);
                ocrResult1 = ocr1.data.text;
                ocrResult2 = ocr2.data.text;
                await scheduler.terminate();
            } catch (error) {
                console.warn('OCR failed:', error);
                ocrResult1 = 'OCR processing failed';
                ocrResult2 = 'OCR processing failed';
            }
        }

        let classificationResult1: any = 'N/A';
        let classificationResult2: any = 'N/A';
        if (enableClassification) {
            self.postMessage({ type: 'progress', payload: { message: 'Analyzing image features...' } });
            
            try {
                self.postMessage({ type: 'progress', payload: { message: 'Classifying Original Image...' } });
                classificationResult1 = await extractImageFeatures(image1);
                
                self.postMessage({ type: 'progress', payload: { message: 'Classifying Edited Image...' } });
                classificationResult2 = await extractImageFeatures(image2ToCompare);
            } catch (error) {
                console.warn('Classification failed:', error);
                classificationResult1 = [];
                classificationResult2 = [];
            }
        }

        self.postMessage({
            type: 'results',
            payload: {
                stats: {
                    mismatchedPixels,
                    differencesFound,
                    mse: mseValue,
                    ssim: ssimValue,
                    imageWidth: image1.width,
                    imageHeight: image1.height,
                    pixelDiffPercentage: (mismatchedPixels / (image1.width * image1.height)) * 100
                },
                annotations: {
                    diffImageData,
                    differences
                },
                ocr: {
                    image1: ocrResult1,
                    image2: ocrResult2,
                },
                classification: {
                    image1: classificationResult1,
                    image2: classificationResult2,
                },
            },
        });

    } catch (error: any) {
        console.error('Worker processing failed:', error);
        self.postMessage({ type: 'error', payload: error.message || 'An unknown error occurred during analysis.' });
    }
}; 