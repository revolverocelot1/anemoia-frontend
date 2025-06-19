import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import ssim from 'ssim.js';
import { createScheduler, createWorker } from 'tesseract.js';

let tfBackendInitialized = false;
let cocoSsdModel: any = null;



/**
 * Advanced image difference detection using multiple methods
 */
function advancedPixelDifference(imageData1: ImageData, imageData2: ImageData, options: {
    colorThreshold?: number;
    brightnessThreshold?: number;
    structuralThreshold?: number;
} = {}): { diffData: Uint8ClampedArray; mismatchedPixels: number } {
    const { colorThreshold = 15, brightnessThreshold = 20, structuralThreshold = 10 } = options;
    const { width, height } = imageData1;
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    const diffData = new Uint8ClampedArray(data1.length);
    let mismatchedPixels = 0;

    for (let i = 0; i < data1.length; i += 4) {
        const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
        const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

        // Calculate different types of differences
        const colorDiff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
        const brightness1 = (r1 + g1 + b1) / 3;
        const brightness2 = (r2 + g2 + b2) / 3;
        const brightnessDiff = Math.abs(brightness1 - brightness2);

        // Enhanced edge detection for structural differences
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        let structuralDiff = 0;

        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            // Sobel operator for edge detection
            const getPixelBrightness = (px: number, py: number) => {
                const idx = (py * width + px) * 4;
                return (data1[idx] + data1[idx + 1] + data1[idx + 2]) / 3;
            };

            const gx = -getPixelBrightness(x - 1, y - 1) + getPixelBrightness(x + 1, y - 1) +
                      -2 * getPixelBrightness(x - 1, y) + 2 * getPixelBrightness(x + 1, y) +
                      -getPixelBrightness(x - 1, y + 1) + getPixelBrightness(x + 1, y + 1);

            const gy = -getPixelBrightness(x - 1, y - 1) - 2 * getPixelBrightness(x, y - 1) - getPixelBrightness(x + 1, y - 1) +
                       getPixelBrightness(x - 1, y + 1) + 2 * getPixelBrightness(x, y + 1) + getPixelBrightness(x + 1, y + 1);

            const edge1 = Math.sqrt(gx * gx + gy * gy);

            // Same for second image
            const getPixelBrightness2 = (px: number, py: number) => {
                const idx = (py * width + px) * 4;
                return (data2[idx] + data2[idx + 1] + data2[idx + 2]) / 3;
            };

            const gx2 = -getPixelBrightness2(x - 1, y - 1) + getPixelBrightness2(x + 1, y - 1) +
                       -2 * getPixelBrightness2(x - 1, y) + 2 * getPixelBrightness2(x + 1, y) +
                       -getPixelBrightness2(x - 1, y + 1) + getPixelBrightness2(x + 1, y + 1);

            const gy2 = -getPixelBrightness2(x - 1, y - 1) - 2 * getPixelBrightness2(x, y - 1) - getPixelBrightness2(x + 1, y - 1) +
                        getPixelBrightness2(x - 1, y + 1) + 2 * getPixelBrightness2(x, y + 1) + getPixelBrightness2(x + 1, y + 1);

            const edge2 = Math.sqrt(gx2 * gx2 + gy2 * gy2);
            structuralDiff = Math.abs(edge1 - edge2);
        }

        // Determine if pixel is different based on multiple criteria
        const isDifferent = colorDiff > colorThreshold || 
                           brightnessDiff > brightnessThreshold || 
                           structuralDiff > structuralThreshold;

        if (isDifferent) {
            // Highlight difference with intensity based on difference magnitude
            const intensity = Math.min(255, Math.max(colorDiff, brightnessDiff, structuralDiff) * 2);
            diffData[i] = intensity;     // Red channel for color differences
            diffData[i + 1] = Math.min(255, brightnessDiff * 3); // Green for brightness
            diffData[i + 2] = Math.min(255, structuralDiff * 5); // Blue for structural
            diffData[i + 3] = 255;
            mismatchedPixels++;
        } else {
            diffData[i] = diffData[i + 1] = diffData[i + 2] = 0;
            diffData[i + 3] = 0;
        }
    }

    return { diffData, mismatchedPixels };
}

/**
 * Smart difference region detection using connected components with better algorithm
 */
function findSmartDifferenceRegions(diffImageData: ImageData, minArea: number = 100): Array<{ id: number; x: number; y: number; w: number; h: number; area: number; intensity: number; }> {
    const { width, height, data } = diffImageData;
    const visited = new Array(width * height).fill(false);
    const regions = [];
    let regionId = 1;

    // Create a binary mask for significant differences
    const threshold = 30; // Minimum intensity to consider as a difference

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const pixelIndex = index * 4;
            
            if (!visited[index]) {
                const intensity = Math.max(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]);
                
                if (intensity > threshold) {
                    const region = smartFloodFill(diffImageData, visited, x, y, regionId, threshold);
                    if (region.area >= minArea) {
                        regions.push(region);
                        regionId++;
                    }
                }
            }
        }
    }

    // Sort regions by area (largest first) and limit to top 50 to prevent whole-image issues
    return regions.sort((a, b) => b.area - a.area).slice(0, 50);
}

/**
 * Smart flood fill that considers intensity and connectivity
 */
function smartFloodFill(imageData: ImageData, visited: boolean[], startX: number, startY: number, id: number, threshold: number) {
    const { width, height, data } = imageData;
    const stack = [{ x: startX, y: startY }];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let area = 0;
    let totalIntensity = 0;

    while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const index = y * width + x;
        const pixelIndex = index * 4;
        
        if (visited[index]) continue;
        
        const intensity = Math.max(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]);
        if (intensity < threshold) continue;
        
        visited[index] = true;
        area++;
        totalIntensity += intensity;
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Add neighboring pixels with adaptive threshold
        const adaptiveThreshold = Math.max(threshold, intensity * 0.5);
        
        [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
         [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]]
        .forEach(([nx, ny]) => {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = ny * width + nx;
                const nPixelIndex = nIndex * 4;
                const nIntensity = Math.max(data[nPixelIndex], data[nPixelIndex + 1], data[nPixelIndex + 2]);
                
                if (!visited[nIndex] && nIntensity >= adaptiveThreshold) {
                    stack.push({ x: nx, y: ny });
                }
            }
        });
    }
    
    return {
        id,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        area,
        intensity: area > 0 ? totalIntensity / area : 0
    };
}

/**
 * Load COCO-SSD model for real object detection
 */
async function loadCocoSsdModel() {
    if (!cocoSsdModel) {
        try {
            // Use CDN for COCO-SSD model
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // @ts-ignore
            cocoSsdModel = await cocoSsd.load();
        } catch (error) {
            console.warn('Failed to load COCO-SSD model:', error);
            cocoSsdModel = null;
        }
    }
    return cocoSsdModel;
}

/**
 * Advanced object detection using COCO-SSD
 */
async function detectObjectsWithCocoSsd(imageBitmap: ImageBitmap): Promise<any[]> {
    try {
        const model = await loadCocoSsdModel();
        if (!model) {
            throw new Error('COCO-SSD model not available');
        }

        // Create tensor from image
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imageBitmap, 0, 0);
        
        // Get image data and convert to tensor
        const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
        const imageTensor = tf.browser.fromPixels(imageData);
        
        // Run detection
        const predictions = await model.detect(imageTensor);
        
        // Clean up tensor
        imageTensor.dispose();
        
        // Format results
        return predictions.map((pred: any, index: number) => ({
            className: pred.class || 'unknown',
            probability: pred.score || 0,
            bbox: pred.bbox || null,
            id: index
        }));
        
    } catch (error) {
        console.warn('COCO-SSD detection failed:', error);
        return [];
    }
}

/**
 * Fallback feature-based classification
 */
async function extractAdvancedImageFeatures(imageBitmap: ImageBitmap): Promise<any[]> {
    const canvas = new OffscreenCanvas(224, 224);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224);
    
    const data = imageData.data;
    let totalR = 0, totalG = 0, totalB = 0;
    let brightness = 0, contrast = 0, edges = 0;
    let colorfulness = 0;
    
    // Advanced color analysis
    const colorHistogram = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        totalR += r; totalG += g; totalB += b;
        brightness += (r + g + b) / 3;
        
        colorHistogram.red[r]++;
        colorHistogram.green[g]++;
        colorHistogram.blue[b]++;
        
        // Calculate colorfulness (deviation from grayscale)
        const gray = (r + g + b) / 3;
        colorfulness += Math.abs(r - gray) + Math.abs(g - gray) + Math.abs(b - gray);
    }
    
    const pixelCount = data.length / 4;
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    brightness /= pixelCount;
    colorfulness /= pixelCount;
    
    // Calculate contrast
    for (let i = 0; i < data.length; i += 4) {
        const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        contrast += Math.abs(pixelBrightness - brightness);
    }
    contrast /= pixelCount;
    
    // Edge detection
    for (let y = 1; y < 223; y++) {
        for (let x = 1; x < 223; x++) {
            const idx = (y * 224 + x) * 4;
            const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
            const down = (data[idx + 224 * 4] + data[idx + 224 * 4 + 1] + data[idx + 224 * 4 + 2]) / 3;
            edges += Math.abs(current - right) + Math.abs(current - down);
        }
    }
    
    // Advanced classification based on comprehensive analysis
    const classifications = [];
    
    // Object type detection based on color and structure
    if (avgR > avgG && avgR > avgB && avgR > 140) {
        if (contrast > 50) {
            classifications.push({ className: "red objects/food (strawberries, tomatoes, apples)", probability: 0.8 });
        } else {
            classifications.push({ className: "red surfaces/clothing", probability: 0.7 });
        }
    }
    
    if (avgG > avgR && avgG > avgB && avgG > 140) {
        if (edges > 30) {
            classifications.push({ className: "vegetation/plants/nature", probability: 0.85 });
        } else {
            classifications.push({ className: "green surfaces/clothing", probability: 0.7 });
        }
    }
    
    if (avgB > avgR && avgB > avgG && avgB > 140) {
        if (colorfulness < 20) {
            classifications.push({ className: "sky/water/blue surfaces", probability: 0.8 });
        } else {
            classifications.push({ className: "blue objects/clothing", probability: 0.7 });
        }
    }
    
    // Scene type detection
    if (brightness > 200) {
        classifications.push({ className: "bright/outdoor scene", probability: 0.75 });
    } else if (brightness < 50) {
        classifications.push({ className: "dark/indoor/night scene", probability: 0.75 });
    }
    
    // Texture analysis
    if (edges > 60) {
        classifications.push({ className: "detailed/textured image (documents, patterns, complex scenes)", probability: 0.8 });
    } else if (edges < 15) {
        classifications.push({ className: "smooth/simple image (portraits, solid colors)", probability: 0.7 });
    }
    
    // Color complexity
    if (colorfulness > 60) {
        classifications.push({ className: "colorful/vibrant image", probability: 0.75 });
    } else if (colorfulness < 15) {
        classifications.push({ className: "monochrome/desaturated image", probability: 0.8 });
    }
    
    // Document detection
    if (brightness > 180 && contrast > 40 && edges > 40 && colorfulness < 30) {
        classifications.push({ className: "text document/paper/book", probability: 0.9 });
    }
    
    // Portrait detection heuristic
    if (avgR > 120 && avgG > 100 && avgB > 80 && Math.abs(avgR - avgG) < 30 && contrast < 60) {
        classifications.push({ className: "possible portrait/person", probability: 0.6 });
    }
    
    return classifications.sort((a, b) => b.probability - a.probability).slice(0, 5);
}

/**
 * Enhanced OCR preprocessing
 */
async function enhancedOcrPreprocessing(imageBitmap: ImageBitmap): Promise<string> {
    const canvas = new OffscreenCanvas(imageBitmap.width * 2, imageBitmap.height * 2); // Upscale for better OCR
    const ctx = canvas.getContext('2d')!;
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw image at 2x scale
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Advanced preprocessing
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        
        // Convert to grayscale using luminance formula
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Apply adaptive thresholding for better text contrast
        const threshold = gray > 127 ? 255 : 0;
        
        // Apply sharpening
        const sharpened = Math.min(255, Math.max(0, threshold + (threshold - gray) * 0.3));
        
        data[i] = data[i + 1] = data[i + 2] = sharpened;
        data[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return URL.createObjectURL(blob);
}

/**
 * Main message handler
 */
self.onmessage = async (event) => {
    if (!tfBackendInitialized) {
        try {
            await tf.setBackend('wasm');
            console.log('TF.js WASM backend initialized successfully.');
            tfBackendInitialized = true;
        } catch (error) {
            console.error("Failed to set WASM backend:", error);
        }
    }

    const { image1: image1blobUrl, image2: image2blobUrl, settings } = event.data;
    const { enableAnnotations, enableOcr, enableClassification, normalizeAspectRatio } = settings;

    try {
        self.postMessage({ type: 'progress', payload: { message: 'Loading and preparing images...' } });
        
        const [image1, image2] = await Promise.all([
            fetch(image1blobUrl).then(res => res.blob()).then(createImageBitmap),
            fetch(image2blobUrl).then(res => res.blob()).then(createImageBitmap)
        ]);

        let image2ToCompare = image2;
        const imagesHaveSameDimensions = image1.width === image2.width && image1.height === image2.height;
        let canPerformPixelComparison = imagesHaveSameDimensions;

        if (!imagesHaveSameDimensions && normalizeAspectRatio) {
            self.postMessage({ type: 'progress', payload: { message: 'Normalizing image dimensions...' } });
            const canvas = new OffscreenCanvas(image1.width, image1.height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get 2D context for resizing.');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image2, 0, 0, image1.width, image1.height);
            image2ToCompare = await createImageBitmap(canvas);
            canPerformPixelComparison = true;
        }

        // Get image data
        const canvas1 = new OffscreenCanvas(image1.width, image1.height);
        const ctx1 = canvas1.getContext('2d')!;
        ctx1.drawImage(image1, 0, 0);
        const imageData1 = ctx1.getImageData(0, 0, image1.width, image1.height);

        const canvas2 = new OffscreenCanvas(image2ToCompare.width, image2ToCompare.height);
        const ctx2 = canvas2.getContext('2d')!;
        ctx2.drawImage(image2ToCompare, 0, 0);
        const imageData2 = ctx2.getImageData(0, 0, image2ToCompare.width, image2ToCompare.height);
        
        // Initialize results
        let diffImageData: ImageData | null = null;
        let mismatchedPixels: number = 0;
        let ssimValue: number | null = null;
        let mseValue: number | null = null;
        let differencesFound: number = 0;
        let differences: any[] = [];

        if (enableAnnotations && canPerformPixelComparison) {
            self.postMessage({ type: 'progress', payload: { message: 'Analyzing pixel differences with advanced algorithms...' } });
            
            // Use advanced difference detection
            const diffResult = advancedPixelDifference(imageData1, imageData2);
            mismatchedPixels = diffResult.mismatchedPixels;
            diffImageData = new ImageData(diffResult.diffData, image1.width, image1.height);

            self.postMessage({ type: 'progress', payload: { message: 'Calculating structural similarity (SSIM)...' } });
            try {
                const ssimResult = ssim(imageData1, imageData2, { k1: 0.01, k2: 0.03, windowSize: 11 });
                ssimValue = ssimResult.mssim;
            } catch (error) {
                console.warn('SSIM calculation failed:', error);
                ssimValue = null;
            }

            self.postMessage({ type: 'progress', payload: { message: 'Computing MSE...' } });
            try {
                let mse = 0;
                for (let i = 0; i < imageData1.data.length; i += 4) {
                    const r1 = imageData1.data[i], g1 = imageData1.data[i + 1], b1 = imageData1.data[i + 2];
                    const r2 = imageData2.data[i], g2 = imageData2.data[i + 1], b2 = imageData2.data[i + 2];
                    mse += (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
                }
                mseValue = mse / (imageData1.data.length / 4) / 3;
            } catch (error) {
                console.warn('MSE calculation failed:', error);
                mseValue = null;
            }

            self.postMessage({ type: 'progress', payload: { message: 'Detecting difference regions...' } });
            try {
                differences = findSmartDifferenceRegions(diffImageData);
                differencesFound = differences.length;
            } catch (error) {
                console.warn('Difference region detection failed:', error);
                differences = [];
                differencesFound = 0;
            }
        }
        
        // Enhanced OCR
        let ocrResult1 = 'N/A';
        let ocrResult2 = 'N/A';
        if (enableOcr) {
            self.postMessage({ type: 'progress', payload: { message: 'Performing enhanced OCR analysis...' } });
            try {
                const scheduler = createScheduler();
                const worker1 = await createWorker(['eng']);
                const worker2 = await createWorker(['eng']);
                
                // Set better OCR parameters
                await worker1.setParameters({
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?:;-()[]{}"\''
                });
                await worker2.setParameters({
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?:;-()[]{}"\''
                });
                
                scheduler.addWorker(worker1);
                scheduler.addWorker(worker2);
                
                const [ocr1, ocr2] = await Promise.all([
                    scheduler.addJob('recognize', await enhancedOcrPreprocessing(image1)),
                    scheduler.addJob('recognize', await enhancedOcrPreprocessing(image2ToCompare))
                ]);
                
                ocrResult1 = ocr1.data.text.trim();
                ocrResult2 = ocr2.data.text.trim();
                await scheduler.terminate();
            } catch (error) {
                console.warn('OCR failed:', error);
                ocrResult1 = 'OCR processing failed';
                ocrResult2 = 'OCR processing failed';
            }
        }

        // Advanced AI Classification
        let classificationResult1: any = [];
        let classificationResult2: any = [];
        if (enableClassification) {
            self.postMessage({ type: 'progress', payload: { message: 'Loading AI models for object detection...' } });
            
            try {
                // Try COCO-SSD first for real object detection
                self.postMessage({ type: 'progress', payload: { message: 'Detecting objects in original image...' } });
                const cocoResults1 = await detectObjectsWithCocoSsd(image1);
                
                self.postMessage({ type: 'progress', payload: { message: 'Detecting objects in edited image...' } });
                const cocoResults2 = await detectObjectsWithCocoSsd(image2ToCompare);
                
                if (cocoResults1.length > 0 || cocoResults2.length > 0) {
                    classificationResult1 = cocoResults1.slice(0, 5);
                    classificationResult2 = cocoResults2.slice(0, 5);
                } else {
                    throw new Error('No objects detected, falling back to feature analysis');
                }
                
            } catch (error) {
                console.warn('COCO-SSD failed, using fallback analysis:', error);
                // Fallback to advanced feature analysis
                self.postMessage({ type: 'progress', payload: { message: 'Analyzing image features...' } });
                classificationResult1 = await extractAdvancedImageFeatures(image1);
                classificationResult2 = await extractAdvancedImageFeatures(image2ToCompare);
            }
        }

        // Send results
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