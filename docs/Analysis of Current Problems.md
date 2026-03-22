# Analysis of Current Problems and Future Plan

## Current Unresolved Issues
1. **Persistent FOV (Field of View) Distortion**:
   - The current viewer consistently fails to load models with the correct perspective. It calculates or defaults to something resembling 22-25°, which looks distorted and zoomed-out.
   - Manually sliding the FOV down to 15° after the model loads yields the desired "sweet spot" look. However, programmatic attempts to enforce this 15° default continuously result in "goalpost shifting", where the initial load still looks bad regardless of the underlying constant changes.
   - The coupling between `gsplat.js`'s camera matrix, the orbit controls' radius calculation, and window resizing logic is completely broken and resists traditional bug fixing.

## Goal for Next Conversation
**Stop fixing the old viewer.** We will build a completely new Splat Viewer from the ground up.

### Primary Directive
Create an exact **1:1 copy** of the splat viewer found at:
[https://radiagallery.com/demo-plants-hiking](https://radiagallery.com/demo-plants-hiking)

- **Zero Deviations**: Do not invent new features or try to adapt the old UI. It must be a total, identical replica of the target website's viewer.
- **Perfect Default Renders**: Every generated SHARP model must look visually perfect on the very first load by correctly parsing and reacting to its embedded metadata, just like a professional viewer would.

## Plan for the New Viewer
1. **Reference Analysis (First Step Next Convo)**:
   - Deep dive into `radiagallery.com/demo-plants-hiking` to analyze their camera initialization, FOV logic, and `gsplat` setup.
   - Extract the math and configurations they use to make environments look naturally scaled.

2. **Clean Slate Architecture**:
   - Discard `splatLens.ts`, the current `SplatViewerPage.tsx`, and the complicated telemetry / `resizeCanvas` loops.
   - Build a fresh React wrapper around the renderer that mimics the target website.

3. **Metadata-Driven Camera**:
   - Ensure that the initial camera `fx/fy` (focal length), position, and orbit radius are strictly defined by the SHARP model's metadata (`width`, `height`, `focalLength`, etc.).
   - Make sure no resize events or render loops corrupt these initial values. 

4. **1:1 UI Replication**:
   - Recreate the exact user interface, controls, and interaction model from the Radia Gallery demo.