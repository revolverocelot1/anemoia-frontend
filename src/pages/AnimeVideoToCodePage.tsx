import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sliders, Terminal, Code, Play, Pause, Copy, ChevronLeft, ChevronRight, Download, Palette as PaletteIcon, Sparkles } from 'lucide-react';
import { animate } from 'animejs';
// 3D engine removed per request; using only Anime.js for DOM/SVG animations

type SamplingStrategy = 'keyframes' | 'uniform' | 'scene-change';

type TransitionStyle = 'fade' | 'crossfade' | 'slide-x' | 'slide-y' | 'scale';

type ShapeType = 'rect' | 'circle' | 'triangle';

type ExportFormat = 'esm' | 'inline';

interface EngineSettings {
  engineMode?: 'svg-contours';
  targetFps: number;
  maxShapesPerFrame: number;
  samplingStrategy: SamplingStrategy;
  colorQuantization: number;
  simplifyTolerance: number;
  vectorization: 'none' | 'edges' | 'contours';
  previewScale: number;
  useWorkers: boolean;
  transition: TransitionStyle;
  transitionDurationMs: number;
  crossfadeOverlapMs: number;
  easing: string;
  shapeType: ShapeType;
  shapeAnim: 'pop' | 'slide-x' | 'slide-y' | 'none';
  shapeStaggerMs: number;
  palette: 'none' | 'neon' | 'matrix' | 'pastel';
  backgroundColor: string;
  exportFormat: ExportFormat;
  loop: boolean;
  startTimeSec: number;
  maxDurationSec: number;
}

interface FrameDescriptor {
  t: number;
  shapes: Array<{
    type: 'rect' | 'circle' | 'path';
    props: Record<string, number | string>;
    style: Record<string, string | number>;
  }>;
}

const DEFAULTS: EngineSettings = {
  engineMode: 'svg-contours',
  targetFps: 12,
  maxShapesPerFrame: 400,
  samplingStrategy: 'keyframes',
  colorQuantization: 16,
  simplifyTolerance: 1.5,
  vectorization: 'edges',
  previewScale: 0.7,
  useWorkers: true,
  transition: 'crossfade',
  transitionDurationMs: 120,
  crossfadeOverlapMs: 60,
  easing: 'inOutQuint',
  shapeType: 'rect',
  shapeAnim: 'pop',
  shapeStaggerMs: 4,
  palette: 'none',
  backgroundColor: '#0b0b10',
  exportFormat: 'esm',
  loop: true,
  startTimeSec: 0,
  maxDurationSec: 2,
};

const THEME = {
  primary: '#00E5FF',
  secondary: '#8A2BE2',
  bg: '#05060a',
  text: '#D1D6DE',
};

const PALETTES: Record<string, Array<[number, number, number]>> = {
  neon: [[255,20,147],[0,255,255],[57,255,20],[255,165,0],[0,229,255],[138,43,226]],
  matrix: [[0,255,65],[0,143,17],[0,80,0],[10,30,10],[200,255,200]],
  pastel: [[255,179,186],[255,223,186],[255,255,186],[186,255,201],[186,225,255]],
};

function nearestPaletteColor(r: number, g: number, b: number, paletteName: EngineSettings['palette']): [number, number, number] {
  if (paletteName === 'none') return [r, g, b];
  const pal = PALETTES[paletteName];
  let best = pal[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const [pr, pg, pb] of pal) {
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (d < bestD) { bestD = d; best = [pr, pg, pb]; }
  }
  return best as [number, number, number];
}

const AnimeVideoToCodePage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ w: number; h: number; d: number } | null>(null);
  const [settings, setSettings] = useState<EngineSettings>(DEFAULTS);
  const [frames, setFrames] = useState<FrameDescriptor[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [autoProcess, setAutoProcess] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const morphPathsRef = useRef<SVGPathElement[] | null>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const playIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const depthWorkerRef = useRef<Worker | null>(null);
  const vectorizeWorkerRef = useRef<Worker | null>(null);

  const scaledSize = useMemo(() => {
    const fallback = { w: 640, h: 360 };
    if (!videoMeta) return fallback;
    return {
      w: Math.max(fallback.w, Math.round(videoMeta.w * settings.previewScale)),
      h: Math.max(fallback.h, Math.round(videoMeta.h * settings.previewScale)),
    };
  }, [videoMeta, settings.previewScale]);

  const isImage = (f: File | null) => !!f && f.type.startsWith('image/');
  const isVideo = (f: File | null) => !!f && f.type.startsWith('video/');

  useEffect(() => {
    if (!vectorizeWorkerRef.current) {
      try { vectorizeWorkerRef.current = new Worker(new URL('../workers/vectorize.worker.ts', import.meta.url), { type: 'module' }); } catch {}
    }
    return () => {};
  }, []);

  useEffect(() => {
    if (!file) return;
    if (isVideo(file)) return; // video path handled by metadata effect
    if (isImage(file) && autoProcess) {
      void handleProcess();
    }
  }, [file, autoProcess]);

  useEffect(() => {
    if (!file || !videoRef.current) return;
    const url = URL.createObjectURL(file);
    const v = videoRef.current;
    v.src = url;
    v.load();
    const handleLoaded = () => {
      setVideoMeta({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
    };
    v.addEventListener('loadedmetadata', handleLoaded);
    return () => {
      v.removeEventListener('loadedmetadata', handleLoaded);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const extractKeyframes = async () => {
    if (!videoRef.current || !canvasRef.current || !videoMeta) return [] as FrameDescriptor[];
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    c.width = scaledSize.w;
    c.height = scaledSize.h;

    const fps = settings.targetFps;
    const start = Math.max(0, Math.min(settings.startTimeSec, videoMeta.d));
    const duration = Math.max(0.2, Math.min(settings.maxDurationSec, Math.max(0, videoMeta.d - start)));
    const total = Math.max(1, Math.floor(duration * fps));
    const framesOut: FrameDescriptor[] = [];

    for (let i = 0; i < total; i++) {
      const t = start + i / fps;
      v.currentTime = t;
      await new Promise<void>(resolve => { v.onseeked = () => resolve(); });
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0, 0, c.width, c.height);

      const grid = Math.max(4, Math.floor(Math.sqrt(settings.maxShapesPerFrame)));
      const cellW = Math.max(2, Math.floor(c.width / grid));
      const cellH = Math.max(2, Math.floor(c.height / grid));

      const shapes: FrameDescriptor['shapes'] = [];
      for (let y = 0; y < c.height; y += cellH) {
        for (let x = 0; x < c.width; x += cellW) {
          const ix = (y * c.width + x) * 4;
          const a = img.data[ix + 3] / 255;
          if (a < 0.05) continue;
          let r = img.data[ix];
          let g = img.data[ix + 1];
          let b = img.data[ix + 2];
          const [qr, qg, qb] = nearestPaletteColor(r, g, b, settings.palette);
          const shape: any = { type: settings.shapeType, props: { x, y, width: cellW, height: cellH }, style: { background: `rgb(${qr},${qg},${qb})`, opacity: 1 } };
          if (settings.shapeType === 'circle') shape.style.borderRadius = '50%';
          shapes.push(shape);
          if (shapes.length >= settings.maxShapesPerFrame) break;
        }
        if (shapes.length >= settings.maxShapesPerFrame) break;
      }

      framesOut.push({ t, shapes });
      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(r => setTimeout(r, 0));
    }

    return framesOut;
  };

  // Depth-based 3D pipeline removed per request

  const extractImageFrame = async () => {
    if (!canvasRef.current || !file) return [] as FrameDescriptor[];
    try {
      let bmp: ImageBitmap | HTMLImageElement | null = null;
      try {
        bmp = await (createImageBitmap as any)(file);
      } catch {
        // Fallback for environments without createImageBitmap
        bmp = await new Promise<HTMLImageElement>((resolve, reject) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
          img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
          img.src = url;
        });
      }
      const c = canvasRef.current;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx || !bmp) return [];
      const targetW = scaledSize.w;
      const targetH = scaledSize.h;
      c.width = targetW;
      c.height = targetH;
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, targetW, targetH);
      const bw = (bmp as any).width; const bh = (bmp as any).height;
      const arImg = bw / bh; const arDst = targetW / targetH;
      let dw = targetW, dh = targetH, dx = 0, dy = 0;
      if (arImg > arDst) { dh = targetH; dw = Math.round(dh * arImg); dx = Math.round((targetW - dw) / 2); }
      else { dw = targetW; dh = Math.round(dw / arImg); dy = Math.round((targetH - dh) / 2); }
      // draw supports both ImageBitmap and HTMLImageElement
      ctx.drawImage(bmp as any, dx, dy, dw, dh);
      const img = ctx.getImageData(0, 0, targetW, targetH);

      const grid = Math.max(4, Math.floor(Math.sqrt(settings.maxShapesPerFrame)));
      const cellW = Math.max(2, Math.floor(targetW / grid));
      const cellH = Math.max(2, Math.floor(targetH / grid));
      const shapes: FrameDescriptor['shapes'] = [];
      for (let y = 0; y < targetH; y += cellH) {
        for (let x = 0; x < targetW; x += cellW) {
          const ix = (y * targetW + x) * 4;
          const a = img.data[ix + 3] / 255;
          if (a < 0.05) continue;
          const r = img.data[ix];
          const g = img.data[ix + 1];
          const b = img.data[ix + 2];
          const [qr, qg, qb] = nearestPaletteColor(r, g, b, settings.palette);
          const shape: any = { type: settings.shapeType, props: { x, y, width: cellW, height: cellH }, style: { background: `rgb(${qr},${qg},${qb})`, opacity: 1 } };
          if (settings.shapeType === 'circle') shape.style.borderRadius = '50%';
          shapes.push(shape);
          if (shapes.length >= settings.maxShapesPerFrame) break;
        }
        if (shapes.length >= settings.maxShapesPerFrame) break;
      }
      // Ensure at least one shape layer is present
      return [{ t: 0, shapes }];
    } catch (e: any) {
      setError('Failed to process image');
      return [];
    }
  };

  const generateAnimeCode = (data: FrameDescriptor[]) => {
    const dur = settings.transitionDurationMs;
    const ease = settings.easing;
    const lines: string[] = [];
    lines.push("import { animate } from 'animejs';");
    lines.push('');
    lines.push('export function play(container) {');
    lines.push("  const q = (sel) => container.querySelectorAll(sel);");
    lines.push('  const steps = [];');
    lines.push('');
    data.forEach((frame, i) => {
      const dt = Math.max(0, Math.round((frame.t - (data[i - 1]?.t ?? data[0].t)) * 1000));
      lines.push(`  // frame ${i} @ ${frame.t.toFixed(3)}s`);
      // shape morphing between frames if compatible
      if (i > 0) {
        lines.push(`  // morph paths from frame ${i-1} to ${i}`);
        lines.push(`  (function(){`);
        lines.push(`    const prev = q('.avtc-f${i-1} path');`);
        lines.push(`    const next = q('.avtc-f${i} path');`);
        lines.push(`    const count = Math.min(prev.length, next.length);`);
        lines.push(`    for (let k=0; k<count; k++){`);
        lines.push(`      const a = prev[k]; const b = next[k];`);
        lines.push(`      if (!a || !b) continue;`);
        lines.push(`      const fromD = (a as any).getAttribute('d');`);
        lines.push(`      const toD = (b as any).getAttribute('d');`);
        lines.push(`      (b as any).setAttribute('d', fromD);`);
        lines.push(`      animate(b, { d: toD }, { duration: ${dur}, ease: '${ease}' });`);
        lines.push(`    }`);
        lines.push(`  })();`);
      }
      if (settings.shapeAnim && settings.shapeAnim !== 'none') {
        lines.push(`  // per-shape entrance animation`);
        lines.push(`  q('.avtc-f${i} > div').forEach((el, idx) => {`);
        if (settings.shapeAnim === 'pop') {
          lines.push(`    el.style.transform = 'scale(0.8)';`);
          lines.push(`    animate(el, { scale: 1 }, { duration: ${Math.max(60, Math.round(settings.transitionDurationMs*0.6))}, delay: idx*${Math.max(0, settings.shapeStaggerMs)}, ease: '${settings.easing}' });`);
        } else if (settings.shapeAnim === 'slide-x') {
          lines.push(`    el.style.transform = 'translateX(8px)';`);
          lines.push(`    animate(el, { x: 0 }, { duration: ${Math.max(60, Math.round(settings.transitionDurationMs*0.6))}, delay: idx*${Math.max(0, settings.shapeStaggerMs)}, ease: '${settings.easing}' });`);
        } else if (settings.shapeAnim === 'slide-y') {
          lines.push(`    el.style.transform = 'translateY(8px)';`);
          lines.push(`    animate(el, { y: 0 }, { duration: ${Math.max(60, Math.round(settings.transitionDurationMs*0.6))}, delay: idx*${Math.max(0, settings.shapeStaggerMs)}, ease: '${settings.easing}' });`);
        }
        lines.push(`  });`);
      }
      switch (settings.transition) {
        case 'fade':
          lines.push(`  steps.push(() => { animate(q('.avtc-f${i}'), { opacity: [0, 1] }, { duration: ${dur}, ease: '${ease}' }); if (${i} > 0) animate(q('.avtc-f${i - 1}'), { opacity: [1, 0] }, { duration: ${dur}, ease: '${ease}' }); });`);
          break;
        case 'crossfade':
          lines.push(`  steps.push(() => { if (${i} > 0) animate(q('.avtc-f${i - 1}'), { opacity: [1, 0] }, { duration: ${Math.max(1, settings.crossfadeOverlapMs)}, ease: '${ease}' }); animate(q('.avtc-f${i}'), { opacity: [0, 1] }, { duration: ${dur}, ease: '${ease}' }); });`);
          break;
        case 'slide-x':
          lines.push(`  steps.push(() => { const cur = q('.avtc-f${i}'); cur.forEach(el => el.style.transform = 'translateX(15px)'); animate(cur, { x: 0, opacity: [0, 1] }, { duration: ${dur}, ease: '${ease}' }); if (${i} > 0) animate(q('.avtc-f${i - 1}'), { x: -15, opacity: [1, 0] }, { duration: ${dur}, ease: '${ease}' }); });`);
          break;
        case 'slide-y':
          lines.push(`  steps.push(() => { const cur = q('.avtc-f${i}'); cur.forEach(el => el.style.transform = 'translateY(15px)'); animate(cur, { y: 0, opacity: [0, 1] }, { duration: ${dur}, ease: '${ease}' }); if (${i} > 0) animate(q('.avtc-f${i - 1}'), { y: -15, opacity: [1, 0] }, { duration: ${dur}, ease: '${ease}' }); });`);
          break;
        case 'scale':
          lines.push(`  steps.push(() => { const cur = q('.avtc-f${i}'); cur.forEach(el => el.style.transform = 'scale(0.98)'); animate(cur, { scale: 1, opacity: [0, 1] }, { duration: ${dur}, ease: '${ease}' }); if (${i} > 0) animate(q('.avtc-f${i - 1}'), { scale: 1.02, opacity: [1, 0] }, { duration: ${dur}, ease: '${ease}' }); });`);
          break;
      }
      if (dt > 0) lines.push(`  steps.push(() => new Promise(r => setTimeout(r, ${dt})));`);
    });
    lines.push('');
    lines.push('  (async () => { for (const s of steps) { await s(); } })();');
    lines.push('}');

    if (settings.exportFormat === 'inline') {
      return [
        '<div id="container"></div>',
        '<script type="module">',
        lines.join('\n'),
        'const container = document.querySelector("#container");',
        'play(container);',
        '</script>'
      ].join('\n');
    }
    return lines.join('\n');
  };

  // SVG Contours pipeline
  const vectorizeFrameToSvg = (img: ImageData, opts: { colors: number; eps: number; minArea: number; maxShapes: number; downscale: number; }): Promise<Array<{ d: string; fill: string; area: number; points?: Array<[number, number]> }>> => {
    return new Promise(resolve => {
      if (!vectorizeWorkerRef.current) return resolve([]);
      const onMsg = (e: MessageEvent) => {
        if (e.data?.status === 'complete') { vectorizeWorkerRef.current?.removeEventListener('message', onMsg as any); resolve(e.data.shapes || []); }
        if (e.data?.status === 'error') { vectorizeWorkerRef.current?.removeEventListener('message', onMsg as any); resolve([]); }
      };
      vectorizeWorkerRef.current.addEventListener('message', onMsg as any);
      vectorizeWorkerRef.current.postMessage({ imageData: img, options: { numColors: opts.colors, simplifyEpsilon: opts.eps, minArea: opts.minArea, maxShapes: opts.maxShapes, downscaleFactor: opts.downscale } });
    });
  };

  const extractKeyframesSvg = async () => {
    if (!videoRef.current || !canvasRef.current || !videoMeta) return [] as FrameDescriptor[];
    const v = videoRef.current; const c = canvasRef.current; const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return [];
    c.width = scaledSize.w; c.height = scaledSize.h;
    const fps = settings.targetFps; const start = Math.max(0, Math.min(settings.startTimeSec, videoMeta.d));
    const duration = Math.max(0.2, Math.min(settings.maxDurationSec, Math.max(0, videoMeta.d - start)));
    const total = Math.max(1, Math.floor(duration * fps));
    const out: FrameDescriptor[] = [];
    for (let i = 0; i < total; i++) {
      const t = start + i / fps; v.currentTime = t; await new Promise<void>(r => { v.onseeked = () => r(); });
      ctx.fillStyle = settings.backgroundColor; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(v, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0,0,c.width,c.height);
      const shapes = await vectorizeFrameToSvg(img, { colors: Math.max(4, settings.colorQuantization), eps: Math.max(0.5, settings.simplifyTolerance), minArea: 12, maxShapes: settings.maxShapesPerFrame, downscale: 0.6 });
      const frameShapes: FrameDescriptor['shapes'] = shapes.map(s => ({ type: 'path', props: { d: s.d, points: s.points || [] }, style: { background: s.fill, fill: s.fill, opacity: 1 } } as any));
      out.push({ t, shapes: frameShapes }); setProgress(Math.round(((i+1)/total)*100)); await new Promise(r => setTimeout(r, 0));
    }
    return out;
  };

  // Helpers for path morph normalization
  const resampleClosed = (points: Array<[number, number]>, target: number): Array<[number, number]> => {
    const pts = points.slice();
    if (pts.length < 3) return pts;
    const segs: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]; const b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy); segs.push(l); total += l;
    }
    const out: Array<[number, number]> = [];
    let acc = 0; let si = 0; let tInSeg = 0;
    for (let k = 0; k < target; k++) {
      const dist = (total * k) / target;
      while (si < segs.length && acc + segs[si] < dist) { acc += segs[si]; si++; tInSeg = 0; }
      const a = pts[si % pts.length]; const b = pts[(si + 1) % pts.length];
      const segLen = segs[si % segs.length] || 1e-6;
      const t = Math.max(0, Math.min(1, (dist - acc) / segLen));
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  };

  const pointsToPathD = (pts: Array<[number, number]>): string => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
    return d + ' Z';
  };

  const normalizeFramesForMorph = (desc: FrameDescriptor[], resamplePoints = 64): FrameDescriptor[] => {
    if (desc.length === 0) return desc;
    const counts = desc.map(f => f.shapes.length);
    const minCount = Math.max(1, Math.min(...counts));
    return desc.map(f => {
      const shapes = f.shapes.slice(0, minCount).map(s => {
        if (s.type === 'path' && (s.props as any).points && (s.props as any).points.length > 2) {
          const rs = resampleClosed(((s.props as any).points as Array<[number, number]>), resamplePoints);
          return { ...s, props: { ...s.props, d: pointsToPathD(rs) } } as any;
        }
        return s;
      });
      return { ...f, shapes };
    });
  };

  const renderPreview = (data: FrameDescriptor[]) => {
    const container = previewContainerRef.current;
    if (!container) return;
    container.innerHTML = '';
    container.style.background = settings.backgroundColor;
    container.style.width = `${scaledSize.w}px`;
    container.style.height = `${scaledSize.h}px`;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Persistent SVG with morphable paths
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${scaledSize.w} ${scaledSize.h}`);
    svg.setAttribute('width', `${scaledSize.w}`);
    svg.setAttribute('height', `${scaledSize.h}`);
    const first = data[0];
    const paths: SVGPathElement[] = [];
    first.shapes.forEach(s => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', String((s.props as any).d));
      const fill = (s.style as any).fill || (s.style as any).background || 'transparent';
      p.setAttribute('fill', String(fill));
      svg.appendChild(p);
      paths.push(p as any);
    });
    container.appendChild(svg);
    morphPathsRef.current = paths;

    if (showGrid) {
      const grid = document.createElement('div');
      grid.style.position = 'absolute';
      grid.style.inset = '0';
      grid.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)';
      grid.style.backgroundSize = '20px 20px, 20px 20px';
      grid.style.pointerEvents = 'none';
      container.appendChild(grid);
    }
  };

  // 3D setup removed

  const handleProcess = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setProgress(0);
      if ((settings.engineMode || 'svg-contours') === 'svg-contours') {
        let desc = await extractKeyframesSvg();
        desc = normalizeFramesForMorph(desc, 64);
        setFrames(desc); setScrubIndex(0); renderPreview(desc);
        const code = generateAnimeCode(desc); if (codeRef.current) codeRef.current.value = code;
      } else {
        const desc = await extractKeyframesSvg();
        const norm = normalizeFramesForMorph(desc, 64);
        setFrames(norm); setScrubIndex(0); renderPreview(norm);
        const code = generateAnimeCode(desc); if (codeRef.current) codeRef.current.value = code;
      }
    } catch (e: any) {
      setError(e?.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopPlayback = () => {
    playIdRef.current += 1;
    setIsPlaying(false);
  };

  const playPreview = async () => {
    if (!previewContainerRef.current || frames.length === 0) return;
    stopPlayback();
    const myId = playIdRef.current;
    setIsPlaying(true);
    // morphing between frames
    const dur = settings.transitionDurationMs;
    const ease = settings.easing;
    const svgPaths = morphPathsRef.current || [];
    for (let i = 1; i < frames.length; i++) {
      if (myId !== playIdRef.current) return;
      const prev = frames[i - 1];
      const next = frames[i];
      const count = Math.min(prev.shapes.length, next.shapes.length, svgPaths.length);
      for (let k = 0; k < count; k++) {
        const p = svgPaths[k];
        const toD = String((next.shapes[k].props as any).d);
        animate(p as any, { d: toD }, { duration: dur, ease });
        const fill = (next.shapes[k].style as any).fill || (next.shapes[k].style as any).background;
        if (fill) (p as any).setAttribute('fill', String(fill));
      }
      const nextT = frames[i + 1]?.t ?? (frames[i].t + 1 / settings.targetFps);
      const dt = Math.max(0, Math.round((nextT - frames[i].t) * 1000));
      setScrubIndex(i);
      await new Promise(r => setTimeout(r, dt));
    }

    if (settings.loop && isPlaying) {
      playPreview();
    } else {
      setIsPlaying(false);
    }
  };

  // 3D preview removed

  const showScrubFrame = (index: number) => {
    if (!previewContainerRef.current) return;
    const total = frames.length;
    for (let i = 0; i < total; i++) {
      const nodes = previewContainerRef.current.querySelectorAll(`.avtc-f${i}`);
      (nodes as any).forEach((el: HTMLElement) => { el.style.opacity = i === index ? '1' : '0'; });
    }
  };

  useEffect(() => { showScrubFrame(scrubIndex); }, [scrubIndex]);

  const copyCode = async () => {
    const text = codeRef.current?.value || '';
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const downloadCode = () => {
    const text = codeRef.current?.value || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animejs-video-${Date.now()}.${settings.exportFormat === 'esm' ? 'js' : 'html'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadDemo = () => {
    const fps = settings.targetFps;
    const total = 24;
    const w = Math.max(640, scaledSize.w || 640);
    const h = Math.max(360, scaledSize.h || 360);
    const data: FrameDescriptor[] = [];
    for (let i = 0; i < total; i++) {
      const t = i / fps;
      const x = Math.round((i / (total - 1)) * (w - 80));
      const y = Math.round(40 + Math.sin((i / (total - 1)) * Math.PI) * (h - 160));
      data.push({
        t,
        shapes: [
          { type: 'rect', props: { x, y, width: 80, height: 80 }, style: { background: 'rgb(0,229,255)' } },
          { type: 'rect', props: { x: w - x - 50, y: h - y - 50, width: 50, height: 50 }, style: { background: 'rgb(138,43,226)' } }
        ]
      });
    }
    setVideoMeta({ w, h, d: (total - 1) / fps });
    setFrames(data);
    setScrubIndex(0);
    renderPreview(data);
    const code = generateAnimeCode(data);
    if (codeRef.current) codeRef.current.value = code;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type.startsWith('video/') || f.type.startsWith('image/'))) setFile(f);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  return (
    <div className="min-h-screen" style={{ background: THEME.bg }}>
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="px-3 py-2 rounded border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
            Home
          </button>
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-cyan-300" />
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: THEME.text }}>
              Anime.js Video → Code Studio
            </h1>
          </div>
          <div />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40" onDrop={onDrop} onDragOver={onDragOver}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                  <Upload size={18} /> Upload Video
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs text-gray-300">
                    <input type="checkbox" className="mr-1" checked={autoProcess} onChange={(e)=>setAutoProcess(e.target.checked)} /> Auto process
                  </label>
                  <button onClick={loadDemo} className="px-2 py-1 text-xs rounded border border-purple-400/40 text-purple-200 hover:bg-purple-500/10 flex items-center gap-1">
                    <Sparkles size={14} /> Demo
                  </button>
                  <button onClick={()=> fileInputRef.current?.click()} className="px-2 py-1 text-xs rounded border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10">
                    Select Video
                  </button>
                  <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={(e)=> setFile(e.target.files?.[0]||null)} className="hidden" />
                </div>
              </div>
              <div className="rounded-lg border-2 border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
                Drag & drop a video here or use Select Video
              </div>
              {file && (
                <div className="mt-2 text-xs text-gray-400 truncate">Selected: {file.name}</div>
              )}
              {error && <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}
            </div>

            <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 space-y-4">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Sliders size={18} /> Engine Settings
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Engine</span>
                  <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={'svg-contours'} disabled>
                    <option value="svg-contours">SVG Contours</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">FPS</span>
                  <input type="range" min={6} max={24} value={settings.targetFps} onChange={(e) => setSettings(s => ({ ...s, targetFps: parseInt(e.target.value) }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Shapes/frame</span>
                  <input type="range" min={100} max={2500} step={50} value={settings.maxShapesPerFrame} onChange={(e) => setSettings(s => ({ ...s, maxShapesPerFrame: parseInt(e.target.value) }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Colors</span>
                  <input type="range" min={4} max={64} step={4} value={settings.colorQuantization} onChange={(e) => setSettings(s => ({ ...s, colorQuantization: parseInt(e.target.value) }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Preview scale</span>
                  <input type="range" min={25} max={200} step={5} value={Math.round(settings.previewScale * 100)} onChange={(e) => setSettings(s => ({ ...s, previewScale: parseInt(e.target.value) / 100 }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Start (s)</span>
                  <input type="number" className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1" min={0} value={settings.startTimeSec} onChange={(e)=> setSettings(s => ({ ...s, startTimeSec: Math.max(0, parseFloat(e.target.value || '0')) }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Max duration (s)</span>
                  <input type="number" className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1" min={0.2} value={settings.maxDurationSec} onChange={(e)=> setSettings(s => ({ ...s, maxDurationSec: Math.max(0.2, parseFloat(e.target.value || '0')) }))} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Transition</span>
                  <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={settings.transition} onChange={(e) => setSettings(s => ({ ...s, transition: (e.target.value as TransitionStyle) }))}>
                    <option value="fade">Fade</option>
                    <option value="crossfade">Crossfade</option>
                    <option value="slide-x">Slide X</option>
                    <option value="slide-y">Slide Y</option>
                    <option value="scale">Scale</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Shape anim</span>
                  <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={settings.shapeAnim} onChange={(e) => setSettings(s => ({ ...s, shapeAnim: e.target.value as any }))}>
                    <option value="none">None</option>
                    <option value="pop">Pop</option>
                    <option value="slide-x">Slide X</option>
                    <option value="slide-y">Slide Y</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Stagger (ms)</span>
                  <input type="number" className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1" min={0} value={settings.shapeStaggerMs} onChange={(e) => setSettings(s => ({ ...s, shapeStaggerMs: Math.max(0, parseInt(e.target.value || '0')) }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Easing</span>
                  <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={settings.easing} onChange={(e) => setSettings(s => ({ ...s, easing: e.target.value }))}>
                    <option value="linear">linear</option>
                    <option value="inOutQuad">inOutQuad</option>
                    <option value="inOutCubic">inOutCubic</option>
                    <option value="inOutQuart">inOutQuart</option>
                    <option value="inOutQuint">inOutQuint</option>
                    <option value="inOutSine">inOutSine</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Duration (ms)</span>
                  <input type="number" className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1" min={10} value={settings.transitionDurationMs} onChange={(e) => setSettings(s => ({ ...s, transitionDurationMs: Math.max(10, parseInt(e.target.value || '0')) }))} />
                </label>
                {settings.transition === 'crossfade' && (
                  <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Overlap (ms)</span>
                    <input type="number" className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1" min={0} value={settings.crossfadeOverlapMs} onChange={(e) => setSettings(s => ({ ...s, crossfadeOverlapMs: Math.max(0, parseInt(e.target.value || '0')) }))} />
                  </label>
                )}
                {/* shape control removed; SVG contours generate paths automatically */}
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Palette</span>
                  <div className="flex items-center gap-2">
                    <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={settings.palette} onChange={(e) => setSettings(s => ({ ...s, palette: (e.target.value as EngineSettings['palette']) }))}>
                      <option value="none">Original</option>
                      <option value="neon">Neon</option>
                      <option value="matrix">Matrix</option>
                      <option value="pastel">Pastel</option>
                    </select>
                    <PaletteIcon size={16} className="text-cyan-300" />
                  </div>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Background</span>
                  <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings(s => ({ ...s, backgroundColor: e.target.value }))} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Show grid</span>
                  <input type="checkbox" checked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Export</span>
                  <select className="bg-black/40 border border-white/10 rounded px-2 py-1" value={settings.exportFormat} onChange={(e) => setSettings(s => ({ ...s, exportFormat: (e.target.value as ExportFormat) }))}>
                    <option value="esm">ES Module</option>
                    <option value="inline">Inline Script</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3"><span className="text-gray-300">Loop</span>
                  <input type="checkbox" checked={settings.loop} onChange={(e) => setSettings(s => ({ ...s, loop: e.target.checked }))} />
                </label>
                {/* 3D depth controls removed */}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={handleProcess} disabled={!file || isProcessing} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50">{isProcessing ? 'Processing…' : 'Process'}</button>
                {!isPlaying ? (
                  <button onClick={playPreview} disabled={frames.length === 0} className="px-4 py-2 rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/10 disabled:opacity-50 flex items-center gap-2"><Play size={16} /> Play</button>
                ) : (
                  <button onClick={stopPlayback} className="px-4 py-2 rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/10 flex items-center gap-2"><Pause size={16} /> Stop</button>
                )}
                <button onClick={downloadCode} disabled={frames.length === 0} className="px-4 py-2 rounded-lg border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-2"><Download size={16} /> Download</button>
                <button onClick={copyCode} disabled={frames.length === 0} className="px-4 py-2 rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 disabled:opacity-50 flex items-center gap-2"><Copy size={16} /> Copy</button>
                <button onClick={()=> setCodeExpanded(v=>!v)} className="px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/10 text-xs">{codeExpanded ? 'Shrink Code' : 'Expand Code'}</button>
              </div>

              {isProcessing && (
                <div className="mt-2 h-2 w-full bg-white/10 rounded"><div className="h-2 rounded" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00E5FF, #8A2BE2)' }} /></div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-2"><Code size={18} /> Generated Anime.js Code</div>
              <textarea ref={codeRef} className="w-full p-3 rounded bg-black/70 text-green-300 font-mono text-xs border border-white/10" style={{ height: codeExpanded ? 480 : 300 }} />
            </div>
          </div>

          <div className="relative rounded-xl border border-cyan-500/20 bg-[rgba(0,0,0,0.55)] overflow-hidden shadow-xl">
            <div className="p-4" style={{ minHeight: `${scaledSize.h + 100}px` }}>
              <div ref={previewContainerRef} className="relative mx-auto rounded-lg border border-white/10 shadow-lg" style={{ width: scaledSize.w, height: scaledSize.h }} />
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <button className="px-2 py-1 text-xs rounded border border-white/10 text-gray-300 hover:bg-white/10" onClick={() => setScrubIndex(i => Math.max(0, i - 1))}><ChevronLeft size={14} /></button>
              <input className="flex-1" type="range" min={0} max={Math.max(0, frames.length - 1)} value={scrubIndex} onChange={(e) => setScrubIndex(parseInt(e.target.value))} />
              <button className="px-2 py-1 text-xs rounded border border-white/10 text-gray-300 hover:bg-white/10" onClick={() => setScrubIndex(i => Math.min(Math.max(0, frames.length - 1), i + 1))}><ChevronRight size={14} /></button>
            </div>

            <div className="absolute top-3 left-3 text-xs text-gray-300 bg-black/40 rounded px-2 py-1 border border-white/10">{scaledSize.w}×{scaledSize.h}px • {settings.targetFps} FPS</div>
          </div>
        </div>

        <video ref={videoRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default AnimeVideoToCodePage;
