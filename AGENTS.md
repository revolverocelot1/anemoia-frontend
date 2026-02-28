# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Anemoia is a browser-based WebGL toolbox (React 18 + Vite 5 + TypeScript). All heavy processing runs client-side via WASM/WebGL/Web Workers. An external backend API (`anemoia-api.onrender.com`, separate repo) powers Gemini features and auth; it is **not** needed for local dev of most tools.

### Running locally
```bash
npm install          # installs deps + copies ONNX WASM files + applies patches
npm run dev          # Vite dev server on :5173 with COOP/COEP headers
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npm test             # vitest
```

### Key gotchas
- **Missing ESLint peer deps**: `eslint-plugin-react-refresh` and `typescript-eslint` are required by `eslint.config.js` but not in `package.json`. Install them: `npm install --save-dev eslint-plugin-react-refresh typescript-eslint`.
- **COOP/COEP headers**: The Vite dev server adds `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`. These are required for `SharedArrayBuffer` (used by ffmpeg.wasm, ONNX threading).
- **Software WebGL (no GPU)**: In cloud VMs without a GPU, Chrome uses SwiftShader. The gsplat Gaussian Splat renderer may show a black canvas initially — the content IS rendered but canvas compositing is delayed until a user interaction (mouse move/click). This is a SwiftShader limitation, not a code bug. On real hardware GPUs this works correctly.
- **SHARP generation**: Uses Depth Anything V2 via `@xenova/transformers` in a Web Worker. First run downloads ~50MB model from HuggingFace (cached in IndexedDB after). Generation of 590K splats takes ~7-15s.
- **Pre-existing test failures**: 24 tests in `SplatViewerPage.test.tsx` fail due to component import issues (pre-existing). 78 tests pass.
- **Pre-existing lint errors**: ~700+ `@typescript-eslint/no-explicit-any` errors (pre-existing, not from any PR changes).

### gsplat coordinate system
The gsplat library's `OrbitControls(camera, canvas, alpha, beta, radius, ...)` uses spherical coordinates:
- `alpha=0, beta=0` → camera at `(0, 0, -radius)`, looking along +Z
- `alpha=0, beta=PI/2` → camera at `(0, -radius, 0)`, looking up
- Front view for SHARP models: `alpha=0, beta=0.15, radius=5`
