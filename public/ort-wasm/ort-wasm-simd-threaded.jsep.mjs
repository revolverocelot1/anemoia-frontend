// ONNX Runtime Web - WASM backend with SIMD and threading support
// This module provides the WebAssembly backend for ONNX Runtime

// Export the WASM backend initialization
export async function initializeWasm() {
  // Return a promise that resolves when WASM is ready
  return Promise.resolve();
}

// Export placeholder for WASM backend
export const wasmBackend = {
  name: 'wasm',
  initialize: initializeWasm,
  createSessionHandler: async () => {
    throw new Error('WASM backend not properly initialized. Please ensure ONNX Runtime Web is loaded.');
  }
};

// Default export
export default wasmBackend; 