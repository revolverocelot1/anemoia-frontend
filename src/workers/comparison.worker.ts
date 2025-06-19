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
        
        let diffImageData: ImageData | null = null;
        let pixelDiffPercentage: number | string = 'N/A';
        let ssimValue: number | string = 'N/A';

        if (enableAnnotations) {
            if (canPerformPixelComparison) {
                self.postMessage({ type: 'progress', payload: { message: 'Calculating pixel differences...' } });
                const diff = new ImageData(image1.width, image1.height);
                const mismatchedPixels = pixelmatch(imageData1.data, imageData2.data, diff.data, image1.width, image1.height, { threshold: 0.1 });
                pixelDiffPercentage = (mismatchedPixels / (image1.width * image1.height)) * 100;
                diffImageData = diff;

                self.postMessage({ type: 'progress', payload: { message: 'Calculating SSIM...' } });
                const ssimResult = ssim(imageData1, imageData2, { k1: 0.01, k2: 0.03, windowSize: 8 });
                ssimValue = ssimResult.mssim;
            } else {
                 self.postMessage({ type: 'progress', payload: { message: 'Image dimensions do not match. Skipping pixel comparison.' } });
            }
        }
        
        let ocrResult1 = 'N/A';
        let ocrResult2 = 'N/A';
        if (enableOcr) {
            self.postMessage({ type: 'progress', payload: { message: 'Performing OCR...' } });
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
        }

        let classificationResult1: any = 'N/A';
        let classificationResult2: any = 'N/A';
        if (enableClassification) {
            self.postMessage({ type: 'progress', payload: { message: 'Analyzing image features...' } });
            
            self.postMessage({ type: 'progress', payload: { message: 'Classifying Original Image...' } });
            classificationResult1 = await extractImageFeatures(image1);
            
            self.postMessage({ type: 'progress', payload: { message: 'Classifying Edited Image...' } });
            classificationResult2 = await extractImageFeatures(image2ToCompare);
        }

        self.postMessage({
            type: 'results',
            payload: {
                stats: {
                    pixelDiffPercentage,
                    ssim: ssimValue,
                },
                annotations: {
                    diffImageData,
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