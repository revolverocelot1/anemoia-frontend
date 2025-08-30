import api from './api';

export type GeminiEditParams = {
  prompt: string;
  file?: File | null;
  imageBase64?: string;
  inputMimeType?: string;
  outputMimeType?: string;
  conversationId?: string;
  isContinuation?: boolean;
};

export async function editImageWithGemini(params: GeminiEditParams): Promise<{ imageBase64: string; mimeType: string; conversationId?: string }>{
  const form = new FormData();
  
  form.append('prompt', params.prompt);
  form.append('input_mime_type', params.inputMimeType || (params.file ? params.file.type : 'image/png'));
  form.append('output_mime_type', params.outputMimeType || 'image/png');
  
  // Add conversation parameters if provided
  if (params.conversationId) {
    form.append('conversation_id', params.conversationId);
  }
  if (params.isContinuation) {
    form.append('is_continuation', 'true');
  }

  // Only append image for initial request, not continuations
  if (!params.isContinuation) {
    if (params.file) {
      form.append('image', params.file);
    } else if (params.imageBase64) {
      form.append('image_base64', params.imageBase64);
    } else {
      throw new Error('Either file or imageBase64 must be provided for initial request');
    }
  }

  try {
    console.log(`[Gemini API] Calling with prompt:`, params.prompt);
    console.log(`[Gemini API] Conversation ID:`, params.conversationId, 'Is continuation:', params.isContinuation);
    const res = await api.upload('/api/gemini/image-edit', form, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log(`[Gemini API] Response received`);
    const data = res.data as { image_base64: string; mime_type: string; conversation_id?: string };
    return { 
      imageBase64: data.image_base64, 
      mimeType: data.mime_type,
      conversationId: data.conversation_id 
    };
  } catch (error: any) {
    console.error(`[Gemini API] Error:`, error);
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


