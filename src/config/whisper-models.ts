export interface WhisperModel {
  id: string;
  name: string;
  size: string;
  language: string;
  downloadSize: string;
  modelPath: string;
  quantized: boolean;
  description?: string;
  fileSize?: number;
}

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    size: '39M',
    language: 'Multilingual',
    downloadSize: '39 MB',
    modelPath: 'onnx-community/whisper-tiny',
    quantized: false,
    description: 'Fastest model, suitable for quick transcriptions with basic accuracy',
    fileSize: 39 * 1024 * 1024
  },
  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny English',
    size: '39M',
    language: 'English only',
    downloadSize: '39 MB',
    modelPath: 'onnx-community/whisper-tiny.en',
    quantized: false,
    description: 'Fastest English-only model, optimized for English transcriptions',
    fileSize: 39 * 1024 * 1024
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    size: '244M',
    language: 'Multilingual',
    downloadSize: '244 MB',
    modelPath: 'onnx-community/whisper-small',
    quantized: false,
    description: 'Balanced model with good accuracy and reasonable speed',
    fileSize: 244 * 1024 * 1024
  },
  {
    id: 'whisper-small-en',
    name: 'Whisper Small English',
    size: '244M',
    language: 'English only',
    downloadSize: '244 MB',
    modelPath: 'onnx-community/whisper-small.en',
    quantized: false,
    description: 'English-optimized version of the small model',
    fileSize: 244 * 1024 * 1024
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    size: '74M',
    language: 'Multilingual',
    downloadSize: '74 MB',
    modelPath: 'onnx-community/whisper-base',
    quantized: false,
    description: 'Recommended default model - good balance of speed and accuracy',
    fileSize: 74 * 1024 * 1024
  },
  {
    id: 'whisper-base-en',
    name: 'Whisper Base English',
    size: '74M',
    language: 'English only',
    downloadSize: '74 MB',
    modelPath: 'onnx-community/whisper-base.en',
    quantized: false,
    description: 'English-optimized base model with improved English accuracy',
    fileSize: 74 * 1024 * 1024
  },
  {
    id: 'distil-small-en',
    name: 'Distil Whisper Small English',
    size: '166M',
    language: 'English only',
    downloadSize: '166 MB',
    modelPath: 'onnx-community/distil-small.en',
    quantized: false,
    description: 'Distilled model - faster than small with similar accuracy',
    fileSize: 166 * 1024 * 1024
  }
];

export const DEFAULT_MODEL = 'whisper-base'; 