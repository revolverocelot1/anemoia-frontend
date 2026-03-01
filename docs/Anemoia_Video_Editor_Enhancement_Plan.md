# Anemoia Video Editor: Feature Enhancement and Implementation Plan

## 1. Introduction

This document provides a comprehensive analysis of the existing Anemoia video editor, compares it against the OpenCut-Z codebase, and presents a detailed, multi-phase implementation plan for new features. The goal is to evolve the Anemoia editor into a more robust and feature-rich tool, addressing current gaps and adding advanced capabilities.

---

## 2. Codebase Analysis & Feature Comparison

### Anemoia Video Editor (Current State)

The Anemoia editor is a functional single-track video editor built with React, TypeScript, and Zustand. It features a canvas-based rendering system (`VideoCompositor`) capable of playing back multiple clips on a timeline. The UI is modern and responsive, built with `react-resizable-panels`.

**Key Strengths:**
*   **Solid Foundation:** A clean, modern codebase with a clear separation of concerns (UI, state, utilities).
*   **Canvas-Based Preview:** The `VideoCompositor` provides a flexible rendering foundation that can be extended for effects and overlays.
*   **Componentized UI:** The editor is built from modular components, making it easy to add or modify parts of the UI.

### OpenCut-Z Analysis

OpenCut-Z is a more mature, open-source video editor with a broader feature set.

**Key Strengths & Architectural Insights:**
*   **Advanced Timeline:** Includes complex interactions like marquee selection, playhead scrubbing, and more granular zoom controls.
*   **History Management:** Has built-in `undo`/`redo` functionality, implying a more sophisticated state management pattern (likely using snapshots or command history).
*   **Integrated Media Processing:** Uses a `processMediaFiles` utility, indicating that media analysis and preparation are handled systematically upon import.
*   **Planned Features:** The codebase includes a commented-out but well-defined `PropertiesPanel`, confirming the architectural foresight for this feature.

### Feature Comparison: Anemoia vs. OpenCut-Z

| Feature | Anemoia Editor Status | OpenCut-Z Status | Gap Analysis & Action |
| :--- | :--- | :--- | :--- |
| **Properties Panel** | ❌ Missing | ❌ Present (but inactive) | **High Priority.** The foundational missing piece for clip-specific editing. |
| **Transitions** | ❌ Missing | ❌ Missing (but planned) | **High Priority.** Essential for basic video editing. |
| **Text Overlay** | ❌ Missing | ❌ Missing (but planned) | **High Priority.** A core feature for modern video content. |
| **Audio Waveforms** | ❌ Missing | ❌ Missing (but planned) | **Medium Priority.** Crucial for audio editing and sync. |
| **Keyframe Animation**| ❌ Missing | ❌ Missing | **Medium Priority.** The gateway to advanced animations and effects. |
| **Advanced Timeline UI**| ⚠️ Basic | ✅ Advanced | Anemoia's timeline lacks marquee selection and advanced context menus. This can be added incrementally. |
| **Undo/Redo** | ❌ Missing | ✅ Present | Requires implementing a history stack in the Zustand store. |
| **AI Features** | ❌ Missing | ❌ Missing | A major new feature set requiring significant research and implementation. |
| **Local Captions** | ❌ Missing | ❌ Missing | Another major feature set requiring WebRTC and speech recognition integration. |

---

## 3. Detailed Implementation Plan

This plan is broken down into phases, as you requested. Each phase includes the necessary research, implementation steps, and potential challenges.

### Phase 2: Core Editing Capabilities

#### A. Properties Panel for Selected Clips
*Goal: Allow users to inspect and modify the properties of any selected clip on the timeline.*

**Implementation Steps:**
1.  **Component Creation:** Create a `PropertiesPanel.tsx` component, similar in structure to the one in OpenCut-Z.
2.  **State Integration:**
    *   Modify the `TimelineStore` to track the ID(s) of the currently selected clip(s). The panel will be hidden if no clip is selected.
    *   When a clip is selected, the `PropertiesPanel` will subscribe to the `TimelineStore` and fetch the full data for that clip.
3.  **UI Controls:**
    *   Add input fields and sliders for `position` (X, Y), `scale`, and `rotation`.
    *   Use a UI library like `shadcn/ui` (which is already in the project) for consistent styling.
4.  **Live Updates:**
    *   When a value is changed in the `PropertiesPanel`, dispatch an `updateClip` action to the `TimelineStore`.
    *   The `PreviewPanel` will listen for these state changes and trigger a re-render of the canvas via the `VideoCompositor` to reflect the changes in real-time.

**Potential Challenges:**
*   **Multi-selection:** Deciding how to display properties when multiple clips with different values are selected (e.g., show "Mixed" or disable the input).
*   **Performance:** Rapidly scrubbing sliders could trigger many re-renders. Debouncing input from the sliders will be necessary.

#### B. Basic Transitions (Fade, Dissolve)
*Goal: Implement smooth transitions between adjacent clips on the same track.*

**Implementation Steps:**
1.  **Data Structure:**
    *   Update the `Clip` type in `src/video-editor/types/index.ts` to include an optional `transition` object (e.g., `{ type: 'fade', duration: 1 }`).
2.  **UI for Adding Transitions:**
    *   In the `Timeline`, create a UI element that appears between clips on the same track where a user can click to add a transition.
    *   Clicking this element will open a small popover or modal to select the transition type and duration.
3.  **Rendering Logic in `VideoCompositor`:**
    *   The `renderFrame` method will be updated. When approaching the end of a clip with a transition, it will need to start loading and rendering the *next* clip simultaneously.
    *   **For a Fade:**
        *   During the transition period, draw the outgoing clip with decreasing opacity (`1.0` -> `0.0`).
        *   Simultaneously, draw the incoming clip on top with increasing opacity (`0.0` -> `1.0`).
    *   **For a Dissolve:** This is visually similar to a fade and can be implemented with the same opacity cross-fade logic.
    *   **Cut:** This is the default behavior (no transition).

**Potential Challenges:**
*   **Performance:** Rendering two video frames at once during a transition is resource-intensive. Pre-loading the upcoming clip into memory will be critical.
*   **Complex Overlaps:** The logic needs to be robust to handle cases where a user trims a clip, which might affect an existing transition.

---

### Phase 3: Advanced Editing Features

#### A. Text Overlay
*Goal: Allow users to add and style text on the video.*

**Implementation Steps:**
1.  **New Track Type:** Introduce a new track type: `'text'`. This will keep text clips separate from video/audio clips.
2.  **Text Clip Data:** Define a `TextClip` type that includes `content`, `fontFamily`, `fontSize`, `color`, `position`, `animation`, etc.
3.  **Text Panel UI:** Create a new tab in the `MediaPanel` for "Text" where users can add new text clips with default styling. These text templates can then be dragged to the timeline.
4.  **Rendering:**
    *   Update the `PreviewPanel`'s render loop. After rendering the video tracks, it will iterate over any active text tracks.
    *   Use the canvas `fillText()` API to draw the text directly onto the main preview canvas at the correct time.
    *   For animations (e.g., "Fade In"), adjust the opacity or position over time based on the keyframe logic from the next feature.

**Potential Challenges:**
*   **Font Loading:** Custom fonts need to be loaded efficiently, possibly using the CSS Font Loading API.
*   **Rich Text:** Supporting rich text (bold, italics within the same text block) is complex on a canvas and may require a simplified HTML-to-canvas rendering library.

#### B. Audio Waveform Visualization
*Goal: Display a visual representation of the audio on audio clips in the timeline.*

**Implementation Steps:**
1.  **Audio Processing Utility:**
    *   Leverage the `ffmpeg.wasm` library (which is already a part of the project for other tasks) or the Web Audio API to extract waveform data.
    *   The Web Audio API's `AudioContext.decodeAudioData` and `getChannelData` can be used to get an array of amplitude values.
2.  **Data Storage:** When an audio or video file is imported, process it to generate the waveform data (an array of numbers, e.g., `[0.1, 0.5, 0.8, ...]`) and store it in IndexedDB alongside the media item.
3.  **Waveform Component:** Create a `Waveform.tsx` component.
4.  **Rendering:**
    *   The `TimelineClip` component for an audio track will render this `Waveform` component.
    *   The component will draw the waveform using a small `<canvas>` element or by rendering a series of `<div>` elements with varying heights, which is often simpler and performant enough for this purpose.

**Potential Challenges:**
*   **Performance:** Processing large audio files on the main thread can freeze the UI. This entire process *must* be offloaded to a Web Worker.
*   **Accuracy:** The visual representation needs to stay perfectly in sync with the audio, even when the clip is trimmed. The component will need to be aware of the `trimStart` and `trimEnd` properties.

#### C. Keyframe Animation
*Goal: Enable animation of properties like position, scale, and opacity over time.*

**Implementation Steps:**
1.  **Data Structure:**
    *   Modify the `Clip` type. Instead of a single value for properties like `scale` or `opacity`, allow them to be an array of keyframe objects: `keyframes: [{ time: 0, value: 1 }, { time: 2, value: 0.5 }]`.
2.  **Keyframe Editor UI:**
    *   This is a significant UI challenge. A new "Keyframe Editor" panel could appear below the timeline when a clip is selected.
    *   It would show a mini-timeline for the selected clip, with diamond icons representing keyframes for each property. Users could add, delete, or drag these keyframes.
3.  **Interpolation Logic:**
    *   Create a utility function `getValueAtTime(keyframes, currentTime)` that calculates the property's value at the current playback time by interpolating between the nearest keyframes (linear interpolation is a good starting point).
4.  **Rendering Integration:**
    *   The `VideoCompositor` and `PreviewPanel` will use this `getValueAtTime` function to get the values for `position`, `scale`, `opacity`, etc., for every frame, resulting in smooth animation.

**Potential Challenges:**
*   **UI Complexity:** Building an intuitive keyframe editor is a major undertaking.
*   **Performance:** Constantly calculating interpolated values for multiple properties on multiple clips can be a performance bottleneck. The logic must be highly optimized.

---

### Phase 4 & 7: AI & Captions (Combined Research)

These phases are highly dependent on external libraries and browser APIs. The approach will be research-heavy first.

#### A. WebGL AI Model (Background Removal) & Whisper.js (Captions)

**Implementation Plan:**
1.  **Technology Research (2-3 days):**
    *   **Background Removal:** Investigate `TensorFlow.js` with the `WebGL` backend. Research pre-trained models like `body-pix` or `selfie-segmentation`. The key is to find models that are small enough for web deployment and performant.
    *   **Speech Recognition:** Deeply evaluate `Whisper.js`. Assess its performance, model sizes (e.g., `tiny.en`), and browser compatibility. Run local performance tests.
2.  **AI Model Integration:**
    *   Implement a `ModelLoader` service to fetch the AI model and store it in IndexedDB for caching. Show a progress bar during the first download.
    *   Create a Web Worker to run the AI inference. The main thread will send video frames to the worker, and the worker will send back the segmentation mask (for background removal).
    *   In the `VideoCompositor`, apply this mask to the video frame on the canvas.
3.  **Caption Generation:**
    *   Use the `MediaStream Recording API` or `ScriptProcessorNode` to capture audio from a video clip.
    *   Pass the audio buffer to a Web Worker running `Whisper.js`.
    *   The worker transcribes the audio and sends back an array of caption segments with text and timestamps.
4.  **Caption Editing UI:**
    *   Create a new track type for captions.
    *   Build a UI where users can see the generated captions, edit the text, and adjust the start/end timings by dragging the caption clips on the timeline.
    *   The `PropertiesPanel` will show styling options (font, color, background) when a caption clip is selected.

**Potential Challenges:**
*   **Performance:** Both AI inference and speech recognition are computationally expensive. Running them in Web Workers is **not optional**. Even then, performance on lower-end devices will be a major concern.
*   **Model Size:** The AI models can be large, leading to long initial load times. Aggressive caching is essential.
*   **Accuracy:** Whisper.js accuracy will vary based on audio quality. The UI must make it easy for users to correct errors.
*   **Browser Permissions:** WebRTC requires explicit user permission to access audio/video streams.

---

### Phase 8: Performance Optimization & Hardening

*Goal: Proactively identify and fix potential sources of error and performance bottlenecks.*

This is an ongoing process, but here are specific areas to focus on:

**Detailed Focus Areas:**
1.  **Memory Management:**
    *   **Object URLs:** Every time `URL.createObjectURL()` is used (e.g., for media previews), it must have a corresponding `URL.revokeObjectURL()` call when the object is no longer needed. A common error is forgetting to revoke, leading to memory leaks.
    *   **Canvas & Video Elements:** When clips are removed from the timeline, ensure their associated `<video>` elements and canvas contexts are completely disposed of and garbage collected.
2.  **UI Freezing (Main Thread Blocking):**
    *   **Rule of Thumb:** Any task that takes longer than 50ms (e.g., file processing, AI inference, waveform generation) *must* be moved to a Web Worker.
    *   **Debouncing/Throttling:** User inputs that can fire rapidly (sliders, window resizing) must be debounced or throttled to prevent a flood of state updates and re-renders.
3.  **State Management Edge Cases:**
    *   **Race Conditions:** When performing asynchronous actions that update state (like loading a project and media simultaneously), ensure there are no race conditions. Use flags like `isLoading` to prevent user interaction until all data is consistent.
    *   **Invalid State:** What happens if a user tries to split a clip at its very edge? Or trims a clip to zero duration? The state update logic (`Zustand` actions) must include validation to reject invalid operations gracefully.
4.  **FFmpeg Robustness:**
    *   **Complex Commands:** FFmpeg commands can fail silently if the input parameters are incorrect. Wrap all `ffmpeg.exec()` calls in `try...catch` blocks.
    *   **File System:** The `ffmpeg.wasm` virtual file system can be a source of errors. Always ensure files are written successfully before executing a command and are cleaned up afterward to prevent memory bloat.
5.  **Cross-Browser Compatibility:**
    *   **Codec Support:** Safari has notoriously limited video/audio codec support compared to Chrome. The application should detect the browser and warn the user about potentially unsupported media formats.
    *   **CSS Prefixes:** While modern CSS is well-supported, some properties used for UI styling might require vendor prefixes for older browsers.
    *   **API Availability:** Check for the existence of APIs like WebRTC or WebGL before attempting to use them, and disable features gracefully if they are not available.

This detailed plan provides a roadmap for turning the Anemoia video editor into a powerful and reliable tool. I am ready to begin with the first phase.

---

## 4. Core Challenges & Guiding Principles (Reminder for Opus AI)

This section details critical challenges and provides guidance to any AI, including Opus, tasked with developing this editor. These principles are derived from fixing initial issues and anticipating future complexities. Adherence to these guidelines is paramount for creating a robust, user-friendly tool that runs effectively on local devices.

### A. Current Issues & Lessons Learned

The initial user feedback highlighted several core architectural weaknesses that have since been addressed. These serve as important lessons:

1.  **Brittle UI Interactions:** The original upload button failed because its `ref` was tied to a conditionally rendered element.
    *   **Lesson:** Critical interactive elements (like file inputs) must have a stable presence in the DOM, independent of UI state changes. Avoid hiding them with `display: none` or conditional rendering if they are controlled from elsewhere.

2.  **Oversimplified Rendering Engine:** The first previewer could not handle more than one video source, causing playback to fail.
    *   **Lesson:** A video editor's rendering engine must be designed for composition from the start. The `VideoCompositor` pattern, which manages multiple media elements and draws them to a central canvas, is the correct approach.

3.  **Blocking the Main Thread:** The initial FFmpeg loading process would freeze the entire editor.
    *   **Lesson:** Any long-running task (file processing, model loading, complex calculations) **must** be offloaded from the main UI thread. Web Workers are not optional; they are a core architectural requirement for a responsive user experience.

### B. Future Challenges & Risks (Local-First Execution)

Developing advanced features meant to run on a user's machine introduces significant risks that must be proactively managed.

1.  **Performance on Diverse Hardware (The Biggest Risk):**
    *   **Challenge:** The developer's machine is not the user's machine. A feature that runs smoothly on a 16GB RAM machine with a dedicated GPU may be unusable on a 4GB laptop with integrated graphics.
    *   **Mitigation:**
        *   **Proxy Files:** For large video files (>500MB or 4K), do not operate on the original file directly during editing. Implement a system to automatically create low-resolution "proxy" versions in a Web Worker upon import. All editing operations (seeking, trimming, previewing) should use the proxy. The full-resolution original is only swapped in during the final export.
        *   **Resource Throttling:** Implement checks to see how many concurrent tasks (e.g., waveform generation, thumbnail extraction) are running in workers, and queue them to avoid overwhelming the user's CPU.

2.  **Browser Inconsistencies:**
    *   **Challenge:** Chrome, Firefox, and Safari have different levels of support for video/audio codecs, WebGL features, and resource limits.
    *   **Mitigation:**
        *   **Codec Detection:** On import, detect the file's codec. If it's potentially problematic (e.g., HEVC for Firefox/Chrome), warn the user and offer to transcode it to a web-safe format (like H.264) in a worker.
        *   **Graceful Degradation:** Before using a browser API (like WebRTC), check for its existence (`if (navigator.mediaDevices)`). If it's not available, disable the corresponding feature and inform the user.

3.  **Memory Management & Leaks:**
    *   **Challenge:** Browsers will crash a tab that exceeds its memory allocation. Video editing is extremely memory-intensive.
    *   **Mitigation:**
        *   **Aggressive Cleanup:** For every `URL.createObjectURL()`, there must be a `URL.revokeObjectURL()`.
        *   **Object Disposal:** When a clip is deleted or a project is closed, explicitly nullify references to large objects (like `<video>` elements, canvas contexts, waveform data arrays) to ensure they are garbage collected.

4.  **AI Model & FFmpeg Brittleness:**
    *   **Challenge:** Both `ffmpeg.wasm` and `Whisper.js` can fail due to out-of-memory errors on the browser's heap, especially with large inputs.
    *   **Mitigation:**
        *   **Chunking:** For `Whisper.js`, feed it smaller chunks of audio rather than the entire file at once.
        *   **Error Handling:** Wrap all `ffmpeg.exec()` and AI model `run()` calls in `try...catch` blocks. Provide the user with a clear, understandable error message (e.g., "This video clip is too long to process in the browser").

### C. Guidance for Opus AI

**Your Prime Directive:** You are building a tool for a **user's computer**, not a server. Performance, efficiency, and robustness are your primary concerns.

1.  **NEVER Block the Main Thread.** Before implementing any feature, ask: "Could this take more than 50ms?" If yes, it **must** go into a Web Worker. This is non-negotiable.
2.  **Assume Nothing About the User's Environment.** Assume they have a slow internet connection, a mid-range laptop, and are using Firefox or Safari. Design for the common case, not the ideal case.
3.  **Memory is Your Most Precious Resource.** Scrutinize every feature for potential memory leaks. Log object URL creation and revocation. Be proactive about cleanup.
4.  **Validate, Validate, Validate.** The state of a user's project is sacred. Before any state update (`TimelineStore` action), validate the input. Can a clip have a negative duration? Can a split happen outside the clip's bounds? Prevent the state from ever becoming corrupted.
5.  **Build Incrementally and Test Thoroughly.** Refer to this document and the `VIDEO_EDITOR_TEST_RESULTS.md` file. Do not move to the next phase until the current one is stable and tested against the edge cases outlined above.

---

## Usage Guide

This section provides a step-by-step guide on how to use the Anemoia video editor.

### Step 1: Installation

1.  **Clone the repository:**
    ```
    git clone https://github.com/yourusername/anemoia-frontend.git
    cd anemoia-frontend
    ```

2.  **Install dependencies:**
    ```
    npm install
    ```

### Step 2: Running the Editor

1.  **Start the development server:**
    ```
    npm run dev
    ```

2.  **Open the editor in your browser:**
    ```
    http://localhost:3000
    ```

### Step 3: Editing Videos

1.  **Import a video:**
    *   Click on the "Import" button and select a video file.

2.  **Trim the video:**
    *   Drag the start and end points of the clip to trim it.

3.  **Add transitions:**
    *   Click on the transition icon between clips to add a transition.

4.  **Add text overlay:**
    *   Click on the "Text" tab in the media panel and drag a text template to the timeline.

5.  **Add audio waveform:**
    *   Click on the waveform icon in the timeline to view the audio waveform.

6.  **Add keyframe animation:**
    *   Select a clip and use the keyframe editor to animate its properties.

7.  **Add captions:**
    *   Click on the "Captions" tab in the media panel and drag a caption clip to the timeline.

8.  **Export the video:**
    *   Click on the "Export" button to export the edited video.

This guide provides a comprehensive overview of the Anemoia video editor's features and functionality. 