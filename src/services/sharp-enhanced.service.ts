/**
 * SHARP Enhanced Service — Routes to the quality-enhanced pipeline worker
 * 
 * Same splat count as standard, dramatically better quality via:
 * - Perspective-correct unprojection
 * - Proper disparity→depth conversion  
 * - Gamma-correct SH colors
 * - Edge-aware depth upsampling
 * - Depth-adaptive splat scaling
 * - Optional HD depth model (V2-Base)
 */

import { sharpFileStore, type StoredFile } from '../utils/sharpFileStore';
import {
    fovToFocalLength,
    mmToFocalLength,
    extractExifFocalLength,
    getImageDimensions
} from './sharp.service';
import { computeIntrinsicFov } from '../utils/splatLens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnhancedWorkerResponse {
    status: 'loading_model' | 'model_ready' | 'processing' | 'complete' | 'error' | 'preload_complete';
    progress?: number;
    message?: string;
    error?: string;
    plyBuffer?: ArrayBuffer;
    metadata?: {
        gaussianCount: number;
        depthWidth: number;
        depthHeight: number;
        minDepth: number;
        maxDepth: number;
        boundsMin: [number, number, number];
        boundsMax: [number, number, number];
        center: [number, number, number];
        focusDepth: number;
        cameraSpace: boolean;
        frontBeta: number;
        parallaxBeta: number;
    };
}

export interface EnhancedGenerationOptions {
    focalLengthPx?: number;
    focalLengthMm?: number;
    horizontalFovDeg?: number;
    gridSize?: number;          // Same gridSize as standard (768 default = 590K splats)
    depthScale?: number;        // Depth range (default: 2.5)
    useBaseModel?: boolean;     // V2-Base for HD depth
    onProgress?: (progress: number, message: string) => void;
}

export interface EnhancedGenerationResult {
    success: boolean;
    fileId?: string;
    filename?: string;
    blob?: Blob;
    metadata?: {
        defaultFov?: number;
        gaussianCount?: number;
        focalLength?: number;
        width?: number;
        height?: number;
        originalFov?: number;
        viewerCalibration?: {
            boundsMin?: [number, number, number];
            boundsMax?: [number, number, number];
            center?: [number, number, number];
            focusDepth?: number;
            cameraSpace?: boolean;
            frontBeta?: number;
            parallaxBeta?: number;
        };
        processingTimeMs?: number;
        fileSize?: number;
    };
    error?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class SharpEnhancedService {
    private worker: Worker | null = null;
    private workerPromise: Promise<Worker> | null = null;

    private async getWorker(): Promise<Worker> {
        if (this.worker) return this.worker;
        if (this.workerPromise) return this.workerPromise;

        this.workerPromise = new Promise<Worker>((resolve, reject) => {
            try {
                const worker = new Worker(
                    new URL('../workers/sharp-enhanced.worker.ts', import.meta.url),
                    { type: 'module' }
                );

                const initHandler = (e: MessageEvent<EnhancedWorkerResponse>) => {
                    if (e.data.status === 'error') {
                        worker.removeEventListener('message', initHandler);
                        reject(new Error(e.data.error || 'Worker init failed'));
                    }
                };

                worker.addEventListener('message', initHandler);
                worker.onerror = (err) => reject(new Error(`Worker error: ${err.message}`));

                this.worker = worker;
                resolve(worker);
            } catch (error) {
                reject(error);
            }
        });

        return this.workerPromise;
    }

    async preloadModel(useBase: boolean = false): Promise<void> {
        try {
            const worker = await this.getWorker();
            return new Promise((resolve, reject) => {
                const handler = (e: MessageEvent<EnhancedWorkerResponse>) => {
                    if (e.data.status === 'preload_complete' || e.data.status === 'model_ready') {
                        worker.removeEventListener('message', handler);
                        resolve();
                    } else if (e.data.status === 'error') {
                        worker.removeEventListener('message', handler);
                        reject(new Error(e.data.error));
                    }
                };
                worker.addEventListener('message', handler);
                worker.postMessage({ command: 'preload', useBaseModel: useBase });
            });
        } catch (error) {
            console.warn('[SharpEnhanced] Preload failed:', error);
        }
    }

    terminateWorker(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerPromise = null;
        }
    }

    async generate(
        imageFile: File,
        options: EnhancedGenerationOptions = {}
    ): Promise<EnhancedGenerationResult> {
        const onProgress = options.onProgress ?? (() => {});
        const gridSize = options.gridSize ?? 768;
        const depthScale = options.depthScale ?? 2.5;
        const useBaseModel = options.useBaseModel ?? true;

        console.log(`[SharpEnhanced] Generating: gridSize=${gridSize}, base=${useBaseModel}`);
        onProgress(0, 'Starting enhanced generation...');

        try {
            const dimensions = await getImageDimensions(imageFile);
            onProgress(2, 'Analyzing image...');

            // ─── Focal length: SAME calculation as standard pipeline ─────
            let focalLengthPx: number;
            if (options.focalLengthPx) {
                focalLengthPx = options.focalLengthPx;
            } else if (options.horizontalFovDeg) {
                focalLengthPx = fovToFocalLength(options.horizontalFovDeg, dimensions.width);
            } else if (options.focalLengthMm) {
                focalLengthPx = mmToFocalLength(options.focalLengthMm, dimensions.width, dimensions.height);
            } else {
                const exifMm = await extractExifFocalLength(imageFile);
                const mm = exifMm ?? 30;
                focalLengthPx = mmToFocalLength(mm, dimensions.width, dimensions.height);
            }

            const originalFov =
                (2 * Math.atan(dimensions.width / (2 * focalLengthPx)) * 180) / Math.PI;

            onProgress(3, 'Preparing high-resolution image...');

            // Scale image: same logic as standard pipeline
            let maxImageSize = 1024;
            if (gridSize >= 1414) maxImageSize = 2560;
            else if (gridSize >= 1024) maxImageSize = 2048;
            else if (gridSize >= 768) maxImageSize = 1536;

            const imageData = await this.loadImageData(imageFile, maxImageSize);
            const startTime = performance.now();

            const worker = await this.getWorker();

            return new Promise<EnhancedGenerationResult>((resolve, reject) => {
                const handleMessage = async (e: MessageEvent<EnhancedWorkerResponse>) => {
                    const { status, progress, message, error, plyBuffer, metadata } = e.data;

                    if (status === 'loading_model') {
                        onProgress(progress || 5, message || 'Loading depth model...');
                    } else if (status === 'model_ready') {
                        onProgress(progress || 10, message || 'Depth model ready');
                    } else if (status === 'processing') {
                        onProgress(progress || 50, message || 'Processing...');
                    } else if (status === 'complete') {
                        worker.removeEventListener('message', handleMessage);

                        if (!plyBuffer) {
                            reject(new Error('No PLY data from enhanced worker'));
                            return;
                        }

                        const processingTimeMs = performance.now() - startTime;
                        onProgress(95, 'Storing result...');

                        const blob = new Blob([plyBuffer], { type: 'application/octet-stream' });
                        const fileId = sharpFileStore.generateId();
                        const filename = imageFile.name.replace(/\.[^/.]+$/, '') + '_enhanced.ply';

                        const storedFile: StoredFile = {
                            id: fileId,
                            filename,
                            blob,
                            size: blob.size,
                            createdAt: new Date(),
                            metadata: {
                                defaultFov: computeIntrinsicFov({
                                    focalLength: focalLengthPx,
                                    width: dimensions.width,
                                    height: dimensions.height,
                                    originalFov,
                                    viewerCalibration: metadata ? {
                                        boundsMin: metadata.boundsMin,
                                        boundsMax: metadata.boundsMax,
                                        center: metadata.center,
                                        focusDepth: metadata.focusDepth,
                                        cameraSpace: metadata.cameraSpace,
                                        frontBeta: metadata.frontBeta,
                                        parallaxBeta: metadata.parallaxBeta,
                                    } : undefined,
                                }, dimensions.width, dimensions.height, 60),
                                gaussianCount: metadata?.gaussianCount || gridSize * gridSize,
                                focalLength: focalLengthPx,
                                width: dimensions.width,
                                height: dimensions.height,
                                originalFov,
                                viewerCalibration: metadata ? {
                                    boundsMin: metadata.boundsMin,
                                    boundsMax: metadata.boundsMax,
                                    center: metadata.center,
                                    focusDepth: metadata.focusDepth,
                                    cameraSpace: metadata.cameraSpace,
                                    frontBeta: metadata.frontBeta,
                                    parallaxBeta: metadata.parallaxBeta,
                                } : undefined,
                                processingTimeMs: Math.round(processingTimeMs),
                                fileSize: blob.size,
                            },
                        };

                        await sharpFileStore.store(storedFile);
                        onProgress(100, 'Enhanced generation complete!');

                        resolve({
                            success: true,
                            fileId,
                            filename,
                            blob,
                            metadata: storedFile.metadata,
                        });
                    } else if (status === 'error') {
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(error || 'Enhanced generation failed'));
                    }
                };

                worker.addEventListener('message', handleMessage);

                worker.postMessage({
                    command: 'generate',
                    imageData: {
                        data: imageData.data,
                        width: imageData.width,
                        height: imageData.height,
                    },
                    gridSize,
                    depthScale,
                    focalLengthPx,
                    useBaseModel,
                });
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[SharpEnhanced] Failed:', error);
            return { success: false, error: message };
        }
    }

    private async loadImageData(file: File, maxSize: number = 1536): Promise<ImageData> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);

                let width = img.naturalWidth;
                let height = img.naturalHeight;

                if (width > maxSize || height > maxSize) {
                    const scale = maxSize / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                resolve(ctx.getImageData(0, 0, width, height));
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }
}

export const sharpEnhancedService = new SharpEnhancedService();
export { SharpEnhancedService };
