import api from './api';

export type GeminiEditParams = {
  prompt: string;
  file?: File | null;
  imageBase64?: string;
  inputMimeType?: string;
  outputMimeType?: string;
};

export async function editImageWithGemini(params: GeminiEditParams): Promise<{ imageBase64: string; mimeType: string }>{
  const form = new FormData();
  
  // Add unique request ID to ensure each request is independent
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const enhancedPrompt = `${params.prompt} [Request ID: ${requestId}]`;
  
  form.append('prompt', enhancedPrompt);
  form.append('input_mime_type', params.inputMimeType || (params.file ? params.file.type : 'image/png'));
  form.append('output_mime_type', params.outputMimeType || 'image/png');

  if (params.file) {
    form.append('image', params.file);
  } else if (params.imageBase64) {
    form.append('image_base64', params.imageBase64);
  } else {
    throw new Error('Either file or imageBase64 must be provided');
  }

  try {
    console.log(`[Gemini API ${requestId}] Calling with prompt:`, params.prompt);
    const res = await api.upload('/api/gemini/image-edit', form, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log(`[Gemini API ${requestId}] Response received`);
    const data = res.data as { image_base64: string; mime_type: string };
    return { imageBase64: data.image_base64, mimeType: data.mime_type };
  } catch (error: any) {
    console.error(`[Gemini API ${requestId}] Error:`, error);
    console.error('Error response:', error.response?.data);
    
    // Provide more user-friendly error messages
    if (error.response?.status === 504) {
      throw new Error('Image generation timed out. Please try again.');
    } else if (error.response?.status === 503) {
      throw new Error('Service temporarily unavailable. Please try again in a moment.');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  }
}


