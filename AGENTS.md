## Cursor Cloud specific instructions

### Project Overview
Anemoia is a React 18 + TypeScript SPA (Vite) providing GPU-accelerated AI tools: 3D depth mapping, pose estimation, AI upscaling, 3D splat viewer, image comparison, subtitle editor, and more. Most tools run entirely client-side using ONNX Runtime, TensorFlow.js, and Hugging Face Transformers.

### Running the Dev Environment
- `npm install` (triggers `postinstall` which copies WASM files and patches packages)
- `npm run dev` — Vite dev server on port 5173
- No backend needed for most tools; Supabase auth uses hardcoded fallback keys

### Key Commands
- Lint: `npm run lint` (ESLint 9 flat config — has ~800 pre-existing warnings/errors)
- Test: `npx vitest run` (6/9 test files pass; SplatViewerPage and ASCIIVideoConverter tests have pre-existing failures)
- Build: `npm run build`
- Dev: `npm run dev`

### Gotchas
- ESLint requires `eslint-plugin-react-refresh`, `typescript-eslint`, and `globals` — these are used in `eslint.config.js` but were missing from `package.json` devDependencies.
- The 3D Splat Viewer uses the `gsplat` library whose OrbitControls uses spherical coordinates: `alpha` (horizontal angle), `beta` (vertical angle), `radius`. Camera position = `(target + radius*sin(α)*cos(β), target - radius*sin(β), target - radius*cos(α)*cos(β))`.
- SHARP PLY generation places the model with Z centered at origin. Camera at `alpha=0, beta=0` looks from negative Z toward positive Z (front view).
- The AI upscaler (`src/workers/upscaler.worker.ts`) does NOT load real ONNX/TF models — it uses `tf.image.resizeBilinear` with a contrast adjustment. A working reference implementation exists in `web-realesrgan-master/` but is not integrated.
- Sub-projects (`video-object-remover/`, `visualtestify-calypso/`, `web-realesrgan-master/`, `image-comparison-standalone/`) are independent and not part of the main build.
