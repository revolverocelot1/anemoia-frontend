## SHARP (ml-sharp) Deep Dive + Anemoia Integration & WebGL/WebGPU Repurpose Plan (Handoff)

This document is written so another AI agent (or a human engineer) can continue implementation without re-discovering context.

### Scope of this doc

- **External codebases dissected**
  - Apple’s upstream SHARP repo: `https://github.com/apple/ml-sharp`
  - A fork that adds a web interface: `https://github.com/cjgaspari/ml-sharp?tab=readme-ov-file#web-interface-one-click-setup`
- **This workspace mapped**
  - Frontend: `D:\anemoia-frontend-the-one-which-works`
  - Backend: `D:\anemoia-backend`
- **End-goal**
  - Repurpose SHARP into a **website tool** that:
    - Accepts user image(s)
    - Produces **3D Gaussian Splats** as `.ply` (optionally `.splat`)
    - Lets user **download** the generated file(s)
    - Lets user **view** the result in the **existing** browser viewer (`/splat-viewer`)
  - Provide an innovation/system-design plan for a **WebGL/WebGPU** version (render + optional on-device inference).

### Where the external repos were downloaded (DO NOT edit in-place)

These repos were cloned into Anemoia’s archive area to avoid accidentally breaking production tool code:

- `D:\anemoia-frontend-the-one-which-works\archive\external\ml-sharp\apple-ml-sharp`
- `D:\anemoia-frontend-the-one-which-works\archive\external\ml-sharp\cjgaspari-ml-sharp`

Treat this folder as **vendor research**. If you must modify anything, copy it into a new `tools/sharp/` folder first.

---

## 1) SHARP: what it does (product mental model)

SHARP takes **a single photo** and predicts a **3D Gaussian Splat scene** (3DGS) that can be rendered from nearby viewpoints.

**The output is a `.ply` file** containing Gaussian parameters per “splat”:

- Position (x,y,z)
- Rotation (quaternion)
- Scale (3-axis)
- Opacity
- Color (stored as spherical harmonics, but SHARP exports only **degree-0** coefficients, i.e. constant color)

The predicted scene is “metric” with **absolute scale**, and uses **OpenCV camera convention**:

- \(x\) right
- \(y\) down
- \(z\) forward

This coordinate convention matters in browser viewers (most default to y-up).

---

## 2) Apple `ml-sharp` codebase deep dive (what runs where)

### 2.1 Entry points and CLI commands

Packaging entrypoint (from `pyproject.toml`):

- Script: `sharp = "sharp.cli:main_cli"`

CLI group:

- `src/sharp/cli/__init__.py`
  - `main_cli` click group
  - subcommands:
    - `sharp predict` (`src/sharp/cli/predict.py`)
    - `sharp render` (`src/sharp/cli/render.py`)

### 2.2 `sharp predict` end-to-end flow (image → Gaussians → `.ply`)

Primary implementation: `src/sharp/cli/predict.py`

**Top-level predict flow**

- Resolve input path: file or directory
- Auto-select device:
  - cuda if available, else mps, else cpu
- Load checkpoint:
  - If no checkpoint path provided, downloads default:
    - `DEFAULT_MODEL_URL = "https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt"`
  - Uses `torch.hub.load_state_dict_from_url`
- Build model:
  - `gaussian_predictor = create_predictor(PredictorParams())`
  - `gaussian_predictor.load_state_dict(state_dict)`
  - `.eval().to(device)`
- For each image:
  - `image, _, f_px = io.load_rgb(image_path)`
  - `gaussians = predict_image(gaussian_predictor, image, f_px, torch.device(device))`
  - `save_ply(gaussians, f_px, (height, width), output_path / f"{stem}.ply")`

**Key takeaways for web repurpose**

- You do not need SHARP’s CUDA renderer to get the `.ply`; inference works on CPU/MPS/CUDA.
- **Focal length** `f_px` is derived from EXIF (see below) and is used to make outputs more physically consistent.

### 2.3 Image preprocessing and EXIF focal length

Implementation: `src/sharp/utils/io.py`

`load_rgb(path)` does:

- Loads image (PIL; `.heic` via `pillow_heif`)
- Reads EXIF and auto-rotates image based on `Orientation`
- Extracts focal length:
  - Prefer `FocalLengthIn35mmFilm` (or `FocalLenIn35mmFilm`)
  - Fallback to `FocalLength`
  - If nothing found: default `30.0mm`
  - If focal length < 10mm, assume it’s not for 35mm and multiply by `8.4` (crude)
- Converts focal length (mm) to pixels:
  - `f_px = f_mm * sqrt(width^2 + height^2) / sqrt(36^2 + 24^2)`

**How SHARP actually uses `f_px` in inference**

In `predict_image()` (CLI), SHARP computes:

- `disparity_factor = f_px / width`

Then inside the model:

- predicted disparity → metric-ish depth via:
  - `depth = disparity_factor / predicted_disparity`

This makes **focal length** a first-order driver of scene scale.

If you can’t reliably extract EXIF in-browser, provide a user override:

- **Option 1 (focal length in pixels)**: direct input `f_px`
- **Option 2 (FOV)**: let user input horizontal FOV and compute:
  - \(f_{px} = \frac{0.5 \cdot width}{\tan(\text{fov}/2)}\)

**Why this matters**

- If you don’t preserve the EXIF workflow in the web tool, outputs may differ (camera scale feels wrong).
- For a browser tool, EXIF extraction must be re-implemented in TS (or accept user-provided focal length).

### 2.4 The “internal resolution” is fixed to 1536

In `predict_image()` (CLI), SHARP resizes every input to `1536×1536`.

That matches model design:

- ViT preset uses `img_size=384` (DINOv2 ViT-L/16 at 384)
- SPN encoder uses a 3-level pyramid (1536, 768, 384)
- `SlidingPyramidNetwork.internal_resolution()` returns `patch_size * 4` = `384 * 4 = 1536`

If you attempt ONNX/WebGPU export, treat **1536** as a key static shape.

### 2.5 Predictor architecture (model graph mental model)

Factory: `src/sharp/models/__init__.py` → `create_predictor(params)`

The predictor is `RGBGaussianPredictor` (`src/sharp/models/predictor.py`).

#### 2.5.1 High-level forward graph

Inputs:

- `image`: `[B, 3, 1536, 1536]`, float, range `[0,1]`
- `disparity_factor`: `[B]` (later reshaped)
- Optional `depth` for training alignment (unused in inference)

Outputs:

- `Gaussians3D` (see below)

Forward stages:

- **Monodepth**:
  - `monodepth_output = monodepth_model(image)`
  - Produces disparity + intermediate features
  - Convert disparity → metric depth:
    - `monodepth = disparity_factor / disparity.clamp(...)`
- **Optional local depth alignment** (training-only):
  - `DepthAlignment` submodule exists mainly for export/tracing stability
- **Initializer**:
  - produces base gaussian values (means/scales/colors/opacities/quats) + feature_input + global scale
- **Gaussian decoder**:
  - consumes feature_input + monodepth encodings → image features
- **Prediction head**:
  - decodes features into deltas
- **Gaussian composer**:
  - combines base + deltas into final Gaussian parameters

Important file references:

- Monodepth model: `src/sharp/models/monodepth.py`
  - uses SPN encoder + multires decoder
- SPN encoder: `src/sharp/models/encoders/spn_encoder.py`
  - creates pyramid, patches, ViT pass, then merges
- Gaussian composer: `src/sharp/models/composer.py`

#### 2.5.2 Gaussians parameterization (`Gaussians3D`)

Defined in `src/sharp/utils/gaussians.py`

`Gaussians3D` fields (torch tensors):

- `mean_vectors`: `[B, N, 3]` (metric, after unprojection)
- `singular_values`: `[B, N, 3]` (positive; scales along principal axes)
- `quaternions`: `[B, N, 4]` (orientation)
- `colors`: `[B, N, 3]` (model internal uses linearRGB)
- `opacities`: `[B, N]` (0..1)

The `.ply` stores:

- `scale_*` as **log(scale)** (scale logits)
- `opacity` as **logit(opacity)**
- `rot_*` quaternion raw
- `f_dc_*` as spherical-harmonics degree-0 coefficients (constant color)

#### 2.5.3 How many Gaussians does SHARP output?

This matters because it drives:

- Browser load time + memory usage
- Whether you can safely return results as JSON/base64 (usually no)
- Whether you should offer `.splat` conversion for faster viewing

**Default configuration (inference / `PredictorParams()`):**

- Internal image size: `1536×1536` (hard-coded in `predict_image()`)
- Initializer stride: `2` (`InitializerParams.stride`)
- Number of depth layers: `2` (`InitializerParams.num_layers`)

From `MultiLayerInitializer.forward()` (`src/sharp/models/initializer.py`):

- `base_height = image_height // stride`
- `base_width  = image_width  // stride`

So with `1536` and `stride=2`:

- `base_height = 768`
- `base_width  = 768`

The predictor outputs Gaussians per pixel on this base grid, per depth layer:

\[
N = \text{num\_layers} \times \text{base\_height} \times \text{base\_width}
\]

\[
N = 2 \times 768 \times 768 = 1{,}179{,}648
\]

So SHARP outputs **~1.18 million splats per image** by default.

> If you later change `num_layers` or `stride`, this changes linearly/quadratically. Treat these parameters as product knobs (quality vs file size vs load time).

#### 2.5.4 NDC → metric unprojection

`predict_image()` returns Gaussians in NDC space, then `unproject_gaussians()` converts to metric.

Key functions:

- `get_unprojection_matrix(extrinsics, intrinsics, image_shape)`:
  - constructs NDC matrix mapping pixel coords to NDC
  - returns inverse of `ndc_matrix @ intrinsics @ extrinsics`
- `apply_transform()`:
  - transforms means: `mean @ R^T + t`
  - transforms covariance by \(R \Sigma R^T\), then decomposes back to quaternion + singular values

Inference uses `extrinsics = identity`.

### 2.6 `.ply` file format produced by SHARP (critical for browser integration)

Implemented in `src/sharp/utils/gaussians.py`:

#### 2.6.1 Vertex properties (per splat)

Order in file is:

- `x`, `y`, `z` (float32)
- `f_dc_0`, `f_dc_1`, `f_dc_2` (float32)  ← SH degree-0 coefficients
- `opacity` (float32) ← **logit** value
- `scale_0`, `scale_1`, `scale_2` (float32) ← **log(scale)**
- `rot_0`, `rot_1`, `rot_2`, `rot_3` (float32) quaternion

#### 2.6.2 Supplementary elements (scene metadata)

SHARP writes extra PLY elements (not all viewers use them):

- `image_size`: `[width, height]` uint32
- `intrinsic`: 9 float32 (3×3 K matrix flattened)
- `extrinsic`: 16 float32 (4×4 identity)
- `frame`: 2 int32 (`[1, num_gaussians]`)
- `disparity`: 2 float32 (10% and 90% quantiles of disparity)
- `color_space`: 1 uint8 (0=sRGB, 1=linearRGB)
- `version`: 3 uint8 `[1, 5, 0]`

#### 2.6.3 Color space behavior (important compatibility detail)

Internally, SHARP predicts Gaussians in **linearRGB**.

But when exporting:

- It converts linearRGB → sRGB before writing `f_dc_*`
  - Rationale: many public renderers do not gamma-correct after rendering; exporting sRGB gives more “correct looking” results in those renderers.
  - In code: `linearRGB2sRGB(gaussians.colors)` then `convert_rgb_to_spherical_harmonics()`
- It encodes `color_space` as `"sRGB"` in the file.

Browser viewer must be robust to either:

- reading the SH coefficients as already “display-space”
- or re-linearizing before blending

`gsplat.js` in Anemoia currently just loads and renders; validate visually.

#### 2.6.4 Practical file sizes & memory (rough estimates)

These are “back of the envelope” but good enough for engineering decisions.

**Per-vertex payload** written by SHARP:

- 14 float32 values:
  - xyz (3)
  - f_dc (3)
  - opacity logit (1)
  - scale logits (3)
  - quaternion (4)
- 14 × 4 bytes = **56 bytes / gaussian**

With the default `N ≈ 1,179,648`:

- Raw vertex payload ≈ `56 * 1,179,648` ≈ **66 MB**

Add PLY header + extra elements (`intrinsic`, `image_size`, etc.) and you still land “roughly” in the **60–80 MB** range for a typical output.

**Why base64-in-JSON is dangerous**:

- Base64 adds ~33% overhead → **~88 MB** just for the bytes
- JSON adds more overhead
- Browsers will often create multiple in-memory copies during:
  - base64 decode
  - Blob creation
  - parsing/loading in the viewer

Peak memory can blow past **500MB–1GB** on mid-range devices for a single scene.

**Production conclusion**:

- Do **binary** transport (`application/octet-stream`) for PLY.
- If you need “instant view”, store the binary in **IndexedDB**, then open `/splat-viewer?loadId=...`.
- Optionally: convert `.ply` → `.splat` client-side for faster loading (SHARP export uses degree-0 SH, so `.splat` losing SH is usually acceptable).

#### 2.6.5 Coordinate system & “up” direction

SHARP uses OpenCV convention:

- \(x\) right
- \(y\) down
- \(z\) forward

Most WebGL orbit controls assume some “up” axis (commonly y-up).

If the scene looks upside down, mirrored, or orbit controls feel inverted:

- **Strategy A (preferred / simplest)**: configure viewer camera-up to match SHARP.
  - cjgaspari’s viewer uses `cameraUp: [0, -1, 0]`.
- **Strategy B (data transform)**: transform gaussians on load:
  - flip y: `y' = -y`
  - also rotate quaternions accordingly (don’t just flip position, or splat ellipsoids will be wrong)

Pragmatic approach for Anemoia:

- Add a **“SHARP / OpenCV mode”** toggle in `/splat-viewer` (or the Sharp tool page) that switches camera-up or applies a transform at load time.

### 2.7 Rendering (`sharp render`) is CUDA-only and not needed for the web tool

`sharp render` uses Python `gsplat` (CUDA) to render camera trajectories. Not required for the web integration since Anemoia already has a WebGL viewer.

Relevant files:

- `src/sharp/cli/render.py`
- `src/sharp/utils/gsplat.py` (python, CUDA-backed)
- `src/sharp/utils/camera.py` (trajectory + camera matrices)

**Coordinate note**

`camera.py` uses `world_up = [0, -1, 0]` to match OpenCV y-down convention.

This is why cjgaspari’s web viewer sets `cameraUp: [0, -1, 0]`.

---

## 3) cjgaspari fork deep dive (web interface wrapper)

Repo path in workspace:

- `D:\anemoia-frontend-the-one-which-works\archive\external\ml-sharp\cjgaspari-ml-sharp`

### 3.1 What changed vs Apple repo

The fork keeps the core model code essentially identical and adds a web interface under:

- `src/sharp/web/`

### 3.2 Server implementation (`src/sharp/web/app.py`)

Framework: **FastAPI**

Key startup behavior:

- On `startup`, it:
  - chooses device `cuda` > `mps` > `cpu`
  - downloads checkpoint via `torch.hub.load_state_dict_from_url`
  - constructs `predictor = create_predictor(PredictorParams())`

Endpoints:

- `GET /` → renders `templates/index.html`
- `POST /predict`:
  - accepts `files: list[UploadFile]`
  - saves each to temp dir
  - `image, _, f_px = sharp_io.load_rgb(file_path)`
  - `gaussians = predict_image(predictor, image, f_px, device)`
  - `save_ply(...)`
  - reads `.ply` bytes and returns base64 in JSON
- `POST /predict/download`:
  - same processing, but returns a zip (`StreamingResponse`) of `.ply`

### 3.3 Frontend implementation (template + JS)

`templates/index.html` uses:

- importmap loading from `esm.sh`:
  - `three`
  - `@mkkellogg/gaussian-splats-3d`

Rendering:

- `static/js/viewer.js` creates a viewer via `GaussianSplats3D.Viewer({...})`
- sets `cameraUp: [0, -1, 0]` (important)
- decodes base64 into a Blob URL, then `viewer.addSplatScene(plyUrl, { format: Ply })`

Upload flow:

- `static/js/main.js` POSTs to `/predict`
- on success, stores base64 on `window.currentPlyData` and calls `window.showViewer`
- provides a download button that saves the Blob to disk

### 3.4 Pros/cons of the fork approach (useful for Anemoia integration)

Pros:

- Simple: no storage, no database
- Immediate preview: JSON includes base64 PLY
- Viewer runs entirely in browser

Cons (important):

- Base64 inflates size ~33% and increases memory pressure
- For multi-million splats, JSON can become too large (timeouts, memory spikes)
- Not friendly for production hosting without rate limiting

For Anemoia, you likely want:

- return PLY as binary (`application/octet-stream`) for download
- optionally also return a small JSON metadata object (counts, size)
- for preview: either stream or store file in browser (IndexedDB) and open in `/splat-viewer`

---

## 4) Anemoia workspace map (what already exists, what must not be broken)

### 4.1 Frontend structure

Root: `D:\anemoia-frontend-the-one-which-works`

Key areas:

- `src/App.tsx`
  - All routes for tools + SEO landing pages
  - Some heavy pages are lazy-loaded to avoid dependency conflicts
- `src/pages/HomePage.tsx`
  - Main tool grid (`ToolCard`)
- `src/pages/SplatViewerPage.tsx`
  - The existing in-browser viewer that loads Gaussian `.ply` via `gsplat` npm package
- `src/utils/gpuUtils.ts`
  - GPU/WebGL/WebGPU detection utilities + performance heuristics
- `src/face-swap/lib/FaceSwapEngine.ts`
  - Shows the pattern used for large model downloads + caching in IndexedDB, onnxruntime-web setup

### 4.2 Existing Gaussian `.ply` viewer (this is the integration target)

Route:

- `/splat-viewer` → `src/pages/SplatViewerPage.tsx`

Gaussian renderer:

- Uses JS library `gsplat` (dependency in `package.json`: `"gsplat": "^1.2.4"`)
- Renderer setup (simplified):
  - `scene = new SPLAT.Scene()`
  - `camera = new SPLAT.Camera()`
  - `renderer = new SPLAT.WebGLRenderer(canvas)`
  - `controls = new SPLAT.OrbitControls(camera, canvas)`
  - `await SPLAT.Loader.LoadAsync(url, scene, () => {})`
  - loop: `renderer.render(scene, camera)`

File handling:

- The page currently accepts a local `.ply` upload and creates a Blob URL.
- It checks whether the PLY is “Gaussian” by reading header:
  - must include `f_dc_0` and `opacity`
- If it isn’t Gaussian, it treats it as a mesh PLY and renders with Three’s `PLYLoader`.

Implication:

- SHARP’s exported `.ply` matches Anemoia’s gaussian detection heuristic.
- So the SHARP output should load directly into `/splat-viewer`.

### 4.3 Existing WebGPU / ONNX patterns (for “on-device SHARP” research)

Anemoia already uses:

- `onnxruntime-web` (`package.json` has `"onnxruntime-web": "1.20.0"`)
- WebGPU detection and preference (various services)
- IndexedDB caching patterns (FaceSwapEngine)
- “download models on demand” flow (FaceSwapEngine, whisper)

This is useful for any attempt to run a distilled SHARP model in-browser.

### 4.4 Backend structure (current reality)

Backend root: `D:\anemoia-backend`

Main app:

- `main.py` is a single FastAPI app containing:
  - auth endpoints
  - some AI endpoints (Gemini, Google AI)
  - “WebGPU dev” info endpoints (mostly static)

Important constraint:

- Backend requirements currently do **not** include PyTorch or SHARP dependencies.
- Production deployment on Render likely has **no GPU**, which makes full SHARP inference unrealistic there.

So: **a SHARP inference backend must be designed carefully** (see plan section).

---

## 5) The missing piece: “SHARP tool” product requirements in Anemoia

### 5.1 Required UX flow

Minimum viable experience:

- User visits a new tool page, e.g.:
  - `/sharp` (and optionally `/sharp/landing` for SEO)
- User uploads 1 image (start with single-image; batch later)
- User clicks “Generate 3D Gaussian Splats”
- System produces:
  - a `.ply` file compatible with `/splat-viewer`
- User can:
  - **Download** `.ply`
  - **Open in Viewer** (preferably one-click) using the existing `/splat-viewer`

Nice-to-haves:

- show an inline preview (embed gaussian viewer inside Sharp tool page)
- show estimated Gaussian count / file size
- allow focal length override
- allow output conversion to `.splat` for faster viewing (colors are constant anyway)

### 5.2 Don’t-break-other-tools constraints (hard requirements)

Because this is a multi-tool site:

- Don’t change global dependencies unless required
- If adding heavy deps (onnx, webgpu, wasm), **lazy-load** the new tool route
- Keep changes localized:
  - New page + new landing page + minimal shared utilities
- Avoid global CSS collisions
- Avoid bundler config changes unless strictly required

---

## 6) System design options for SHARP generation in a web product

There are 3 realistic deployment architectures. The doc includes all because the “best” depends on cost + constraints.

### Option A — Remote GPU inference (recommended for a real product)

**Summary**

- Browser uploads image → a GPU-backed inference service runs SHARP → returns `.ply`
- Browser previews in existing viewer and/or downloads

**Why**

- SHARP’s checkpoint + model is huge; running it on-device in browser is not practical today for most users.

**Implementation approach**

- Create a separate “Sharp Inference Service” (FastAPI) that:
  - loads model at startup
  - has `/predict` and `/predict/download` endpoints similar to cjgaspari
  - supports job queue + cancellation
  - enforces limits (image size, request size, concurrency)
- Host it on a GPU provider (RunPod/Modal/etc.), not on Render.
- Anemoia frontend calls this service via HTTPS.

**Reference architecture (simple, works well)**

```
[Browser /sharp]  --multipart upload-->  [Sharp Inference API (FastAPI)]
                                         |  (loads SHARP once)
                                         v
                                   [GPU Worker: predict -> save_ply]
                                         |
                         <-- binary .ply bytes (or .zip) ------------
[Browser stores Blob in IndexedDB] -> [Navigate to /splat-viewer?loadId=...]
```

**Synchronous vs asynchronous APIs**

- **Synchronous (simplest)**
  - `POST /predict` returns the `.ply` bytes directly.
  - Works if inference time is “seconds” and you keep payload binary.
  - Must handle: reverse proxy timeouts, slow client connections, retries.
- **Async job model (more robust at scale)**
  - `POST /predict/jobs` → `{ jobId }`
  - `GET /predict/jobs/{jobId}` → `{ status, progress, eta }`
  - `GET /predict/jobs/{jobId}/result` → `.ply` bytes
  - This avoids holding connections open and makes retries safer.

**Optional: object storage for results**

If you want shareable links or to offload bandwidth from the GPU worker:

- worker uploads `.ply` / `.zip` to S3/R2
- API returns a short-lived signed URL

This is not required for MVP, but it’s a common production evolution.

**Integration in Anemoia**

- The frontend tool page is just a client for this service.
- The output `.ply` is loaded into `/splat-viewer` via Blob URL.

**Key risks**

- Cost & rate limiting
- Privacy expectations (images leave device)

### Option B — Local CPU inference inside Anemoia backend (dev-only, not recommended for prod)

**Summary**

- Add SHARP dependencies to `D:\anemoia-backend` and run SHARP in-process.

**Why it’s not recommended**

- Render free/cheap tiers won’t handle PyTorch + 1536² inference well.
- Even if it runs, it will be slow and may crash due to memory.

**When it’s still useful**

- Local dev, quick prototyping of UI and file flow.

### Option C — On-device inference (WebGPU) (research project, high effort)

**Summary**

- Convert SHARP model (or a distilled variant) to ONNX/WebGPU and run entirely in the browser.

**Why**

- Matches Anemoia’s “client-side processing” philosophy.

**Hard problems**

- Model size (download, memory)
- Operator support (ONNX runtime WebGPU)
- Performance (1536×1536 + ViT is expensive)

**Most realistic version of Option C**

- Distill/train a smaller variant:
  - smaller ViT backbone (tiny/small)
  - lower internal resolution (e.g., 768)
  - fewer splats / layers
  - quantized weights

---

## 7) WebGL/WebGPU repurpose plan (the “innovate” section)

There are two separate “web” problems:

- **Rendering** splats in browser (already solved via Anemoia’s viewer, but can be upgraded)
- **Generating** splats in browser (hard, research)

### 7.1 Rendering plan (WebGL → WebGPU path)

Anemoia’s current viewer uses `gsplat` which is WebGL-based.

#### Phase R0 — Keep existing viewer, ensure SHARP coordinate correctness

Work items:

- Add a “SHARP / OpenCV coordinate” toggle to viewer (or Sharp tool page) that:
  - sets camera-up to `[0, -1, 0]` OR
  - applies transform `y = -y` to splat positions on load

Why:

- cjgaspari viewer explicitly sets `cameraUp: [0, -1, 0]` for SHARP.

#### Phase R1 — Convert `.ply` to `.splat` for speed (optional)

Per gsplat.js docs, `.splat` loads faster than `.ply`.

- SHARP output is degree-0 SH only (constant color), so loss of SH is not an issue.
- Add optional “Optimize for viewer” step:
  - parse PLY → produce `.splat` buffer → load that in viewer

This can be done client-side to avoid server complexity.

#### Phase R2 — WebGPU renderer (advanced)

Build a WebGPU renderer for Gaussian splats:

- Storage buffers:
  - positions (vec3)
  - scales (vec3)
  - quaternions (vec4)
  - colors (vec3)
  - opacity (float)
- Compute pass:
  - frustum cull
  - compute screen-space conic (2×2 covariance)
  - compute depth key
  - GPU sort (radix sort) OR CPU sort fallback for small scenes
- Render pass:
  - instanced quads or point sprites
  - fragment shader evaluates 2D Gaussian and alpha blends

Milestone definition:

- “WebGPU viewer parity”: load SHARP `.ply`, orbit controls, render at similar FPS as WebGL on modern GPU.

### 7.2 Generation plan (the hard part): “SHARP on WebGPU”

#### Reality check

The released SHARP model is not a small mobile model:

- Uses DINOv2 ViT-L/16 encoders (timm)
- Uses SPN pyramid with many patches at 1536 resolution
- Weights likely hundreds of MB to >1GB

So the plan must assume:

- either remote inference (Option A)
- or a distilled/quantized model (Option C variant)

#### Phase G0 — Make the web tool architecture backend-agnostic

Before doing model work, design the UI and the “SharpEngine” abstraction so you can swap generation backends later.

Suggested interface:

- `SharpEngine.generate({ imageFile, focalLengthPx?, focalLengthMm?, mode })`
  - returns `{ plyBlob, metadata }`
- Modes:
  - `"remote"` (HTTP)
  - `"local-webgpu"` (future)
  - `"local-cpu"` (dev only)

#### Phase G1 — Production path: remote inference service + viewer integration

Implement the Sharp tool page with remote inference:

- upload image
- poll job status (or stream)
- receive `.ply` bytes
- show:
  - “Download .ply”
  - “Open in viewer”

This unblocks product value while research continues.

#### Phase G2 — Research path: model export feasibility study

Goal: determine whether the current checkpoint can be exported to ONNX in a way that runs in browser.

Tasks:

- Torch export attempt:
  - `torch.onnx.export` or `torch.export` → ONNX
  - fixed input shape `[1, 3, 1536, 1536]`
  - include `disparity_factor` input
- Check ONNX operator coverage for `onnxruntime-web` WebGPU:
  - ViT attention ops
  - LayerNorm variants
  - Resize/Interpolate
  - Any custom ops (avoid)

Expected result:

- Likely fails or runs too slowly/memory heavy on typical devices.

##### Phase G2.1 — Export gotchas specific to SHARP (read before burning time)

These are the traps that make “just export to ONNX” fail.

- **SPN split/merge uses Python loops**
  - `SlidingPyramidNetwork` builds patches with Python `for` loops and merges them back similarly.
  - For FX tracing, they mark `split()` / `merge()` with `torch.fx.wrap` to treat them as atomic.
  - ONNX export usually needs these operations expressed as tensor ops (`unfold`/`fold`, `reshape`, `concat`) rather than opaque Python.
- **Don’t export unprojection/covariance SVD**
  - The model forward outputs Gaussians in an internal “NDC-ish” parameterization.
  - `unproject_gaussians()` uses covariance composition/decomposition (includes SVD + CPU fp64 conversion in `decompose_covariance_matrices`).
  - If you try to export the *full* pipeline, this will be a major blocker.
  - Preferred approach: export only the neural net that predicts Gaussians, then implement unprojection + `.ply` writing in JS/WebGPU.
- **Conditional alignment logic exists (but can be bypassed)**
  - `DepthAlignment` exists to isolate conditional logic for symbolic tracing.
  - In inference, you pass `depth=None`, so the alignment estimator path is effectively disabled.
  - Keep it that way for export (don’t introduce optional inputs you don’t need).
- **Static shape expectations**
  - Much of SHARP assumes `1536×1536` internal resolution (SPN pyramid, patch grid).
  - If you want dynamic shapes, you’re signing up for deeper model surgery.

#### Phase G3 — Distilled SHARP “web model” (invent/innovate)

If you truly need on-device generation, do not try to brute-force the full model. Build a “web-SHARP”:

- smaller encoder (tiny/small transformer or ConvNext-tiny)
- lower internal res (768 or 512)
- output fewer splats (aggressive pruning)
- quantized weights (int8 or fp16)
- training:
  - distill from full SHARP outputs (teacher-student)
  - dataset: images → teacher PLY → student learns gaussian params

The key innovation is to treat SHARP as a teacher that generates pseudo-ground-truth splats.

Deliverable:

- An ONNX model < ~100MB
- Runs in WebGPU with acceptable quality

#### Phase G4 — Client-side `.ply` writer in TypeScript

To generate PLY in browser you must replicate SHARP export logic:

- `opacity_logit = ln(o / (1-o))`
- `scale_logit = ln(scale)`
- `f_dc = (sRGB - 0.5) / sqrt(1/(4*pi))`
- write binary little-endian PLY with correct header and vertex layout

This is doable and independent of the neural net.

---

## 8) Concrete integration plan for the next implementer (safe, minimal diffs)

### 8.1 Frontend additions (recommended file plan)

Add:

- `src/pages/SharpPage.tsx`
- `src/pages/landing/SharpLanding.tsx`
- `src/services/sharp.service.ts` (HTTP calls + typed responses)
- `src/store/generatedFilesStore.ts` (Zustand) OR `src/utils/idbFiles.ts` (IndexedDB) for passing big blobs to `/splat-viewer`

Edit (minimal):

- `src/App.tsx`
  - add routes:
    - `/sharp` → `SharpPage`
    - `/sharp/landing` → `SharpLanding`
- `src/pages/HomePage.tsx`
  - add a new `ToolCard` for SHARP
- `src/components/NavigationBreadcrumb.tsx`
  - add route label mapping for `sharp`

### 8.2 Viewer handoff: “Open in existing viewer”

The key problem: you cannot put a `.ply` blob into a URL.

Use one of these patterns:

- **Pattern A (Zustand in-memory)**
  - Store `Blob` + filename in a global store
  - Navigate to `/splat-viewer`
  - Viewer checks store; if present, loads that blob first
  - Limitation: page refresh loses state
- **Pattern B (IndexedDB persistent)**
  - Store blob under a generated id
  - Navigate to `/splat-viewer?loadId=...`
  - Viewer reads from IndexedDB and loads
  - Supports refresh and long-lived results

Given large `.ply` sizes, Pattern B is safer.

### 8.3 Backend/service shape for remote inference

If building a GPU inference service, mirror cjgaspari API but improve transport:

- `POST /api/sharp/predict`
  - returns:
    - `application/octet-stream` PLY bytes
    - headers:
      - `Content-Disposition: attachment; filename="scene.ply"`
      - optional `X-Gaussian-Count`, `X-Processing-Time`
- `POST /api/sharp/predict.zip`
  - returns zip for multiple images

Do NOT return base64 JSON for large scenes.

### 8.4 Operational guardrails

Enforce:

- max image size (e.g., 10MB)
- max request count (batch size)
- timeouts
- concurrency limits
- cleanup of temp files

---

## 9) “Known gotchas” checklist (things that will waste time if you forget)

- **Coordinate system mismatch**
  - SHARP uses y-down OpenCV convention.
  - Some viewers need cameraUp flipped or y inverted.
- **Base64 responses don’t scale**
  - Don’t ship huge PLY in JSON.
- **Render vs inference**
  - Apple’s `sharp render` is CUDA-only; ignore for web tool.
- **Focal length affects scale**
  - If EXIF isn’t available in-browser, provide a focal-length slider with a sane default.
- **Render deployment reality**
  - Render backend probably cannot host PyTorch SHARP. Use separate GPU service.
- **License/model terms**
  - Check `LICENSE` and `LICENSE_MODEL` in the upstream repo before shipping commercially, redistributing weights, or exposing a public endpoint.

---

## 10) Implementation checklist (Anemoia-safe, minimal blast radius)

This is the “do this next” section. Follow it in order to minimize risk to the rest of the multi-tool site.

### 10.1 Decide your generation backend *first* (don’t build UI around the wrong assumption)

- **If you want something that works for real users soon**: pick **Option A (remote GPU inference)** and build the frontend as a thin client.
- **If you only want a local prototype**: Option B can work on your dev machine, but treat it as disposable.
- **If you want “WebGPU generation”**: accept this is a research track and should not block shipping a useful tool.

### 10.2 Frontend: minimal Sharp tool page (safe skeleton)

**Goal**: add a new tool without touching shared infrastructure more than necessary.

Create these files (new):

- `src/pages/SharpPage.tsx`
  - upload UI (reuse patterns from upscaler + image chat)
  - buttons:
    - “Generate”
    - “Download”
    - “Open in 3D Viewer”
  - show warnings for low-end devices (reuse `gpuUtils.ts`)
- `src/pages/landing/SharpLanding.tsx`
  - SEO landing in same style as other tool landings
- `src/services/sharp.service.ts`
  - wraps HTTP to inference backend (or local dev backend)
- `src/utils/sharpFileStore.ts` (or `src/utils/idbFiles.ts`)
  - IndexedDB persistence for large blobs (recommended)

Edit these files (minimal, localized):

- `src/App.tsx`
  - Add route `/sharp` → `SharpPage`
  - Add route `/sharp/landing` → `SharpLanding`
  - If you add heavy deps later, lazy-load `SharpPage` like SubtitlePage
- `src/pages/HomePage.tsx`
  - Add a new `ToolCard` pointing to `/sharp/landing` or `/sharp`
- `src/components/NavigationBreadcrumb.tsx`
  - Add a label for `sharp`

### 10.3 Frontend ↔ Viewer handoff (do this properly or you’ll regret it)

Because a SHARP `.ply` can be ~60–80MB, you cannot “just pass it via URL”.

**Recommended pattern (IndexedDB, refresh-safe)**:

- On generation success in `SharpPage`:
  - Write `{ id, filename, blob, createdAt, size }` to IndexedDB
  - Navigate to `/splat-viewer?loadId=<id>`
- In `SplatViewerPage`:
  - On mount, check `loadId` query param
  - If present:
    - load blob from IndexedDB
    - create Blob URL
    - set viewer’s `fileUrl` to that Blob URL
  - Optional:
    - after successful load, delete the IndexedDB entry (or keep for history)

**Why**:

- Avoids huge base64 payloads in memory.
- Survives page refresh.
- Doesn’t require server-side storage.

### 10.4 Remote inference service API contract (binary-first)

Avoid cjgaspari’s JSON base64 for production.

**Endpoint 1 (single image)**:

- `POST /api/sharp/predict`
  - `multipart/form-data`
    - `image`: file
    - optional: `focal_length_px` or `focal_length_mm`
  - Response:
    - status `200`
    - `Content-Type: application/octet-stream`
    - `Content-Disposition: attachment; filename="<stem>.ply"`
    - optional headers:
      - `X-Gaussian-Count: 1179648`
      - `X-Processing-Time-Ms: 850`

**Endpoint 2 (batch / zip)**:

- `POST /api/sharp/predict.zip`
  - `multipart/form-data` with `images[]`
  - Returns `application/zip`

**Endpoint 3 (health)**:

- `GET /api/sharp/health`
  - Returns `{ status: "ok", model_loaded: true, device: "cuda" }`

### 10.5 Remote inference service implementation blueprint (FastAPI)

Build this as a **separate service** from `D:\anemoia-backend` unless you have a strong reason not to.

Minimum structure:

- `app.py` (FastAPI)
- `sharp_engine.py` (model init + predict function)
- `limits.py` (file size limits, allowed extensions)
- `Dockerfile` (GPU base image)

Key implementation rules:

- Load model once at startup (global singleton).
- Run inference in a worker thread or process:
  - prevent blocking the event loop
- Enforce strict limits:
  - max upload size
  - max pixels (reject 8k images even if compressed small)
  - concurrency limit per GPU (often 1–2)
- Return binary `.ply` directly (stream or bytes).

### 10.6 Coordinate system integration step (viewer UX)

Before shipping, confirm SHARP PLYs look correct in Anemoia’s viewer.

- If upside down/inverted:
  - add a “SHARP/OpenCV mode” toggle that flips camera-up or transforms the splats on load

This is a small change with huge UX impact.

### 10.7 Rollout plan for a multi-tool site (don’t break the homepage)

- Add the tool card but gate it:
  - hide it behind a flag until the backend is stable
- Add graceful degradation:
  - If `/api/sharp/health` fails, show “Service offline” and disable Generate.

---

## 11) Validation & testing plan (don’t ship blind)

### 11.1 Output-format validation (fast sanity check)

After generating a `.ply`, verify:

- Header contains `element vertex <N>`
- Vertex properties include:
  - `x y z`
  - `f_dc_0 f_dc_1 f_dc_2`
  - `opacity`
  - `scale_0 scale_1 scale_2`
  - `rot_0 rot_1 rot_2 rot_3`

If these fields are missing or renamed, `/splat-viewer` will treat it as a mesh or fail to load.

### 11.2 Viewer validation (core user story)

Manual test:

- Generate `.ply`
- Click “Open in 3D Viewer”
- Confirm:
  - scene renders (not blank)
  - orbit controls work
  - scene orientation matches expectations (not upside down)

### 11.3 Performance validation (prevent user-device crashes)

At minimum:

- Test on a mid-range laptop GPU (or integrated GPU) in Chrome
- Watch memory in DevTools while loading a SHARP `.ply`
- If peak memory is too high:
  - add `.ply → .splat` conversion option
  - add a warning banner using `gpuUtils.ts` low-end detection

### 11.4 Regression validation (multi-tool safety)

Because this repo hosts many tools:

- Confirm you did not change shared deps in a way that breaks:
  - Subtitle editor (lazy-loaded)
  - Upscaler
  - Pose / depth map pages
  - Splat viewer itself

Smoke checklist:

- `npm run build`
- Navigate through major routes quickly (home → splat-viewer → upscaler → depth-map).

---

## 12) Appendix A — Quick file/path index (high-signal)

### External: Apple ml-sharp

- CLI entry: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/cli/__init__.py`
- Predict CLI: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/cli/predict.py`
- PLY save/load: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/utils/gaussians.py`
- Image loading/EXIF focal length: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/utils/io.py`
- Predictor graph: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/models/predictor.py`
- SPN encoder pyramid logic: `archive/external/ml-sharp/apple-ml-sharp/src/sharp/models/encoders/spn_encoder.py`

### External: cjgaspari web interface

- FastAPI server: `archive/external/ml-sharp/cjgaspari-ml-sharp/src/sharp/web/app.py`
- UI template: `archive/external/ml-sharp/cjgaspari-ml-sharp/src/sharp/web/templates/index.html`
- Viewer JS: `archive/external/ml-sharp/cjgaspari-ml-sharp/src/sharp/web/static/js/viewer.js`

### Anemoia frontend

- Routes: `src/App.tsx`
- Existing viewer: `src/pages/SplatViewerPage.tsx`
- GPU utilities: `src/utils/gpuUtils.ts`
- ONNX cache pattern: `src/face-swap/lib/FaceSwapEngine.ts`

### Anemoia backend

- FastAPI app: `D:\anemoia-backend\main.py`

---

## 13) Appendix B — SHARP PLY vertex schema (copy-paste spec)

When you need to validate output compatibility with `/splat-viewer`, ensure the vertex element contains at least:

- `property float x`
- `property float y`
- `property float z`
- `property float f_dc_0`
- `property float f_dc_1`
- `property float f_dc_2`
- `property float opacity`  (logit)
- `property float scale_0`  (log(scale))
- `property float scale_1`
- `property float scale_2`
- `property float rot_0`
- `property float rot_1`
- `property float rot_2`
- `property float rot_3`

Optional but recommended metadata elements:

- `intrinsic`, `image_size`, `color_space`


