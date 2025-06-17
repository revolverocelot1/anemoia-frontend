// src/config/models.ts -> THE FINAL, CORRECT VERSION

export interface ModelDefinition {
    displayName: string;
    path: string;
}

export const DEPTH_MODELS: Record<string, ModelDefinition> = {
    'depth_anything_v2_small': {
        displayName: 'Depth Anything V2 (Quality)',
        path: 'depth-anything/depth-anything-v2-small', // Correct path for ONNX model
    }
};

export const DEFAULT_MODEL_KEY = 'depth_anything_v2_small';

export const models = {
    depthAnything: {
        path: 'Xenova/depth-anything',
        displayName: 'Depth Anything',
        modelFile: 'model.onnx'
    }
} as const;