import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatImageWithGemini } from '../services/gemini.service';

function GeminiImageChatPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const fileArr = Array.from(selected).slice(0, 6);
    setFiles(fileArr);
    setImagePreviews(fileArr.map(f => URL.createObjectURL(f)));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectFiles(e.dataTransfer.files);
  };

  const onGenerate = async () => {
    if (!prompt || prompt.trim().length === 0) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    try {
      const res = await chatImageWithGemini({
        prompt,
        files: files.length > 0 ? files : undefined,
        conversationId,
        isContinuation: !!conversationId,
        outputMimeType: 'image/png'
      });
      setResultImage(`data:image/png;base64,${res.imageBase64}`);
      if (res.conversationId) setConversationId(res.conversationId);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen w-full">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <div className="relative px-6 py-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">Gemini Image Chat</h1>
          <p className="text-gray-400 mt-2">Text-to-image with optional multiple input images</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900/80 rounded-2xl border border-cyan-500/30 p-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want, or instruct edits..."
                className="w-full h-28 bg-transparent outline-none text-gray-200 placeholder-gray-500"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">Model: google/gemini-2.5-flash-image-preview:free</div>
                <button
                  onClick={onGenerate}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50"
                >{isLoading ? 'Generating...' : (conversationId ? 'Continue' : 'Generate')}</button>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={onDrop}
              className="bg-gray-900/80 rounded-2xl border border-purple-500/30 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300 font-semibold">Input Images (optional)</div>
                  <div className="text-xs text-gray-500">Drag & drop up to 6 images or click to select</div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
                >Select</button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onSelectFiles(e.target.files)} />
              </div>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img src={src} className="w-full h-24 object-cover rounded-lg border border-gray-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3 rounded-lg border border-red-500/30 bg-red-900/20 text-red-300">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-gray-900/80 rounded-2xl border border-cyan-500/30 p-4">
            <div className="text-sm text-gray-300 font-semibold mb-2">Output</div>
            <div className="aspect-[3/4] bg-gray-800/60 border border-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
              {resultImage ? (
                <img src={resultImage} className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-500 text-sm">No image yet</div>
              )}
            </div>
            {conversationId && (
              <div className="mt-2 text-xs text-gray-500">Conversation: {conversationId.slice(0, 8)}...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeminiImageChatPage;


