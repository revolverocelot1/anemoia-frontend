import * as tf from '@tensorflow/tfjs';
import ssim from 'ssim.js';
import pixelmatch from 'pixelmatch';
import { createScheduler, createWorker } from 'tesseract.js';

// Set the backend to WASM for better performance.
tf.setBackend('wasm');

const IMAGE_SIZE = 224; // Standard size for many classification models.

/**
 * Pre-processes an image for OCR by converting it to grayscale and increasing contrast.
 * @param {ImageBitmap} imageBitmap - The image to preprocess.
 * @returns {Promise<string>} A data URL of the processed image.
 */
async function preprocessOcrImage(imageBitmap: ImageBitmap): Promise<string> {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and apply contrast enhancement.
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
 * The main message handler for the worker.
 * This function orchestrates the entire image comparison process.
 */
self.onmessage = async (event) => {
    const { image1: image1blobUrl, image2: image2blobUrl, settings } = event.data;
    const { enableAnnotations, enableOcr, enableClassification, normalizeAspectRatio } = settings;

    try {
        self.postMessage({ type: 'progress', payload: { message: 'Fetching and decoding images...' } });
        
        // Step 1: Fetch and decode images
        const [image1, image2] = await Promise.all([
            fetch(image1blobUrl).then(res => res.blob()).then(createImageBitmap),
            fetch(image2blobUrl).then(res => res.blob()).then(createImageBitmap)
        ]);

        // Step 2: Resize images if necessary
        let image2ToCompare = image2;
        if (normalizeAspectRatio && (image1.width !== image2.width || image1.height !== image2.height)) {
            self.postMessage({ type: 'progress', payload: { message: 'Normalizing aspect ratio...' } });
            const canvas = new OffscreenCanvas(image1.width, image1.height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get 2D context for resizing.');
            ctx.drawImage(image2, 0, 0, image1.width, image1.height);
            image2ToCompare = await createImageBitmap(canvas);
        }

        // --- Analysis Tasks ---
        const canvas1 = new OffscreenCanvas(image1.width, image1.height);
        const ctx1 = canvas1.getContext('2d')!;
        ctx1.drawImage(image1, 0, 0);
        const imageData1 = ctx1.getImageData(0, 0, image1.width, image1.height);

        const canvas2 = new OffscreenCanvas(image2ToCompare.width, image2ToCompare.height);
        const ctx2 = canvas2.getContext('2d')!;
        ctx2.drawImage(image2ToCompare, 0, 0);
        const imageData2 = ctx2.getImageData(0, 0, image2ToCompare.width, image2ToCompare.height);
        
        // --- Annotation and Stats Calculation ---
        let diffImageData: ImageData | null = null;
        let pixelDiffPercentage = 0;
        let ssimValue = 0;
        if (enableAnnotations) {
            self.postMessage({ type: 'progress', payload: { message: 'Calculating pixel differences...' } });
            const diff = new ImageData(image1.width, image1.height);
            const mismatchedPixels = pixelmatch(imageData1.data, imageData2.data, diff.data, image1.width, image1.height, { threshold: 0.1 });
            pixelDiffPercentage = (mismatchedPixels / (image1.width * image1.height)) * 100;
            diffImageData = diff;

            self.postMessage({ type: 'progress', payload: { message: 'Calculating SSIM...' } });
            const ssimResult = ssim(imageData1, imageData2, { k1: 0.01, k2: 0.03, windowSize: 8 });
            ssimValue = ssimResult.mssim;
        }
        
        // --- OCR Task ---
        let ocrResult1 = 'N/A';
        let ocrResult2 = 'N/A';
        if (enableOcr) {
            self.postMessage({ type: 'progress', payload: { message: 'Performing OCR on Original...' } });
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

        // --- AI Classification ---
        let classificationResult1: any = 'N/A';
        let classificationResult2: any = 'N/A';
        if (enableClassification) {
            self.postMessage({ type: 'progress', payload: { message: 'Loading classification model...' } });
            
            const modelUrl = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json';
            const labelsUrl = 'https://storage.googleapis.com/download.tensorflow.org/data/imagenet_class_index.json';

            const [model, labels] = await Promise.all([
              tf.loadGraphModel(modelUrl) as Promise<tf.GraphModel>,
              fetch(labelsUrl).then(res => res.json())
            ]);
 
            const canvas = new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
            const ctx = canvas.getContext('2d')!;
  
            const classify = async (image: ImageBitmap) => {
                ctx.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
                const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
                
                const tensor = tf.browser.fromPixels(imageData)
                    .expandDims(0)
                    .toFloat()
                    .div(255);
  
                const predictions = model.predict(tensor) as tf.Tensor;
                const topK = await predictions.topk(3);
                
                const indices = await topK.indices.data();
                const values = await topK.values.data();
  
                tensor.dispose();
                predictions.dispose();
                topK.indices.dispose();
                topK.values.dispose();
  
                return Array.from(indices).map((index: any, i: number) => ({
                    className: labels[String(index)][1],
                    probability: values[i],
                }));
            };
  
            self.postMessage({ type: 'progress', payload: { message: 'Classifying Original Image...' } });
            classificationResult1 = await classify(image1);
            
            self.postMessage({ type: 'progress', payload: { message: 'Classifying Edited Image...' } });
            classificationResult2 = await classify(image2ToCompare);

            model.dispose();
        }

        // --- Final Results ---
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