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

export async function editImageWithGemini(params: GeminiEditParams): Promise<{ imageBase64: string; mimeType: string; conversationId?: string }> {
  const form = new FormData();
  
  form.append('prompt', params.prompt);
  form.append('input_mime_type', params.inputMimeType || (params.file ? params.file.type : 'image/png'));
  form.append('output_mime_type', params.outputMimeType || 'image/png');
  
  // Add conversation parameters if provided
  if (params.conversationId) {
    console.log('Adding conversation_id to form:', params.conversationId);
    form.append('conversation_id', params.conversationId);
  }
  if (params.isContinuation !== undefined) {
    console.log('Adding is_continuation to form:', params.isContinuation);
    form.append('is_continuation', params.isContinuation ? 'true' : 'false');
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
    console.log(`[Gemini API] Calling with prompt:`, params.prompt.substring(0, 100) + '...');
    console.log(`[Gemini API] Mode:`, params.isContinuation ? 'Chain continuation' : 'New request');
    console.log(`[Gemini API] Has image:`, params.file ? 'Yes' : params.imageBase64 ? 'Base64' : 'No');
    
    const res = await api.upload('/api/gemini/image-edit', form, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 120000 // 2 minute timeout
    });
    
    console.log(`[Gemini API] Response received, status:`, res.status);
    const data = res.data as { image_base64: string; mime_type: string; conversation_id?: string };
    
    if (!data.image_base64) {
      throw new Error('No image data in response');
    }
    
    console.log(`[Gemini API] Image size:`, data.image_base64.length, 'Conv ID:', data.conversation_id);
    
    return { 
      imageBase64: data.image_base64, 
      mimeType: data.mime_type,
      conversationId: data.conversation_id 
    };
  } catch (error: any) {
    console.error(`[Gemini API] Error:`, error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // Provide more user-friendly error messages
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. The image generation is taking longer than expected.');
    } else if (error.response?.status === 504) {
      throw new Error('Server timeout. Please try again with a simpler prompt.');
    } else if (error.response?.status === 503) {
      throw new Error('AI service temporarily unavailable. Please try again.');
    } else if (error.response?.status === 502) {
      throw new Error('Failed to generate image. The AI service may be overloaded.');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else if (error.message) {
      throw new Error(`Generation failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during image generation');
  }
}


export type GeminiChatParams = {
  prompt: string;
  files?: File[];
  imageBase64List?: string[];
  inputMimeTypes?: string[];
  outputMimeType?: string;
  conversationId?: string;
  isContinuation?: boolean;
};

export async function chatImageWithGemini(params: GeminiChatParams): Promise<{ imageBase64: string; mimeType: string; conversationId?: string }>{
  const form = new FormData();
  form.append('prompt', params.prompt);
  form.append('output_mime_type', params.outputMimeType || 'image/png');

  if (params.conversationId) {
    form.append('conversation_id', params.conversationId);
  }
  form.append('is_continuation', params.isContinuation ? 'true' : 'false');

  // Prefer files; else imageBase64List
  if (!params.isContinuation) {
    if (params.files && params.files.length > 0) {
      for (const f of params.files) {
        form.append('images', f);
      }
      if (params.inputMimeTypes && params.inputMimeTypes.length > 0) {
        for (const mt of params.inputMimeTypes) {
          form.append('input_mime_types', mt);
        }
      }
    } else if (params.imageBase64List && params.imageBase64List.length > 0) {
      form.append('image_base64_list', JSON.stringify(params.imageBase64List));
      if (params.inputMimeTypes && params.inputMimeTypes.length > 0) {
        for (const mt of params.inputMimeTypes) {
          form.append('input_mime_types', mt);
        }
      }
    }
  }

  try {
    const res = await api.upload('/api/gemini/image-chat', form, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 120000,
    });
    const data = res.data as { image_base64: string; mime_type: string; conversation_id?: string };
    if (!data.image_base64) throw new Error('No image data in response');
    return { imageBase64: data.image_base64, mimeType: data.mime_type, conversationId: data.conversation_id };
  } catch (error: any) {
    console.error('[Gemini Chat] Error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. The image generation is taking longer than expected.');
    } else if (error.response?.status === 504) {
      throw new Error('Server timeout. Please try again with a simpler prompt.');
    } else if (error.response?.status === 503) {
      throw new Error('AI service temporarily unavailable. Please try again.');
    } else if (error.response?.status === 502) {
      throw new Error('Failed to generate image. The AI service may be overloaded.');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else if (error.message) {
      throw new Error(`Generation failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during image generation');
  }
}


