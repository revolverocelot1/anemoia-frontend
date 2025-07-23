# Troubleshooting Transcription Issues

## Current Status

### Issues Found:

1. **Main App Not Loading** (http://localhost:5174/ is blank)
   - There's a syntax error in SubtitlePageEnhanced.tsx line 721
   - Also missing export "OptimizationSupport" in video-export-optimized.ts
   - This prevents the main React app from loading

2. **Transcription Works But No Output**
   - Audio extraction is successful
   - Model loading appears to work
   - But transcription produces no results

## Test Pages Created

I've created several test pages to help diagnose the issue:

### 1. Debug Console (http://localhost:5174/debug-transcription.html)
- Tests individual components:
  - Web Worker functionality
  - Transformers.js import
  - ONNX Runtime
- Click each button to test components individually

### 2. Simple Test (http://localhost:5174/simple-transcription-test.html) 
- Standalone test without workers
- Generates test audio
- Loads model directly
- Tests transcription

### 3. Original Test (http://localhost:5174/test-transcription-fixed.html)
- Full transcription test with file upload
- Uses the same worker as the main app

## How to Test

### Step 1: Test Basic Functionality
1. Open http://localhost:5174/simple-transcription-test.html
2. Click "Generate 5-second Test Audio"
3. Click "Load Whisper Tiny Model" (wait for download)
4. Click "Transcribe Audio"
5. Check the output box for results

### Step 2: Debug Components
1. Open http://localhost:5174/debug-transcription.html
2. Click "Test Worker" - should show worker messages
3. Click "Test Transformers.js" - should load successfully
4. Click "Test ONNX Runtime" - should show version info

### Step 3: Test with Real Video
1. Open http://localhost:5174/test-transcription-fixed.html
2. Select the video file: `test file/output (1).mp4`
3. Choose "Whisper Base" model
4. Click "Load Model" and wait
5. Click "Start Transcription"

## Common Issues and Solutions

### Issue: Model Loading Hangs
**Symptoms**: Progress stops during model download
**Solution**: 
- Check browser console for CORS errors
- Try a different model (Tiny instead of Base)
- Clear browser cache and retry

### Issue: Transcription Returns Empty
**Symptoms**: Audio extracted, model loaded, but no text output
**Possible Causes**:
1. Audio format issues (needs 16kHz mono)
2. Model expects speech but gets music/noise
3. Worker communication issues

### Issue: Browser Compatibility
**Requirements**:
- WebAssembly support
- Web Workers support
- Preferably Chrome/Edge (better WASM performance)

## Quick Fix for Main App

To get the main app working, you need to:

1. Fix the syntax error in SubtitlePageEnhanced.tsx
2. Add missing export in video-export-optimized.ts (already done)
3. Restart the dev server

## Testing Transcription Directly

If you want to test transcription without the UI:

1. Open browser console (F12)
2. Navigate to any of the test pages
3. Run this code:

```javascript
// Load transformers.js
const { pipeline } = await import('@huggingface/transformers');

// Create pipeline
const transcriber = await pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-tiny'
);

// Test with dummy audio
const audio = new Float32Array(16000); // 1 second of silence
const result = await transcriber(audio);
console.log(result);
```

## Next Steps

1. **Check Browser Console**: Look for specific error messages
2. **Test Different Audio**: Try with actual speech audio
3. **Verify Model Files**: Check Network tab for failed downloads
4. **Try Different Browser**: Edge/Chrome work best

The transcription system uses:
- Hugging Face transformers.js
- ONNX Runtime for model execution
- Web Workers for background processing
- Whisper AI models (Tiny/Base/Small) 