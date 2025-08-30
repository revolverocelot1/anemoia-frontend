// Lightweight SVG vectorization worker
// 1) K-means color quantization
// 2) Region border tracing to get polygons
// 3) RDP simplification and filtering

type VectorizeRequest = {
  imageData: ImageData;
  options: {
    numColors: number; // 4..64
    simplifyEpsilon: number; // 0.5..5
    minArea: number; // px^2
    maxShapes: number; // limit
    downscaleFactor?: number; // 0.25..1
  };
};

type PathShape = {
  d: string;
  fill: string;
  area: number;
  points?: Array<[number, number]>; // for morphing
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function rdpSimplify(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length < 3) return points;
  const d2 = (p: [number, number], a: [number, number], b: [number, number]) => {
    const [px, py] = p; const [ax, ay] = a; const [bx, by] = b;
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return (px - ax) ** 2 + (py - ay) ** 2;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const lx = ax + t * dx, ly = ay + t * dy;
    return (px - lx) ** 2 + (py - ly) ** 2;
  };
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const eps2 = epsilon * epsilon;
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0; let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = d2(points[i], points[s], points[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > eps2) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

function kmeansQuantize(pixels: Uint8ClampedArray, width: number, height: number, k: number) {
  k = Math.max(2, Math.min(64, k));
  // init centroids by random samples
  const centroids = new Float32Array(k * 3);
  const n = width * height;
  const step = Math.max(1, Math.floor(n / (k * 10)));
  let ci = 0;
  for (let idx = 0; idx < n && ci < k; idx += Math.max(1, Math.floor(n / k))) {
    const p = idx * 4; centroids[ci * 3] = pixels[p]; centroids[ci * 3 + 1] = pixels[p + 1]; centroids[ci * 3 + 2] = pixels[p + 2]; ci++;
  }
  while (ci < k) { // fallback fill
    const rnd = ((ci * 97) % n) * 4; centroids[ci * 3] = pixels[rnd]; centroids[ci * 3 + 1] = pixels[rnd + 1]; centroids[ci * 3 + 2] = pixels[rnd + 2]; ci++;
  }
  const labels = new Uint16Array(n);
  const sums = new Float32Array(k * 3);
  const counts = new Uint32Array(k);
  const iter = 8;
  for (let it = 0; it < iter; it++) {
    sums.fill(0); counts.fill(0);
    for (let i = 0; i < n; i += step) {
      const p = i * 4; const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
      let best = 0; let bestD = 1e12;
      for (let c = 0; c < k; c++) {
        const dr = r - centroids[c * 3]; const dg = g - centroids[c * 3 + 1]; const db = b - centroids[c * 3 + 2];
        const d = dr * dr + dg * dg + db * db; if (d < bestD) { bestD = d; best = c; }
      }
      labels[i] = best; counts[best]++; sums[best * 3] += r; sums[best * 3 + 1] += g; sums[best * 3 + 2] += b;
    }
    for (let c = 0; c < k; c++) {
      const cnt = Math.max(1, counts[c]);
      centroids[c * 3] = sums[c * 3] / cnt; centroids[c * 3 + 1] = sums[c * 3 + 1] / cnt; centroids[c * 3 + 2] = sums[c * 3 + 2] / cnt;
    }
  }
  // assign all pixels final labels
  for (let i = 0; i < n; i++) {
    const p = i * 4; const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
    let best = 0; let bestD = 1e12;
    for (let c = 0; c < k; c++) {
      const dr = r - centroids[c * 3]; const dg = g - centroids[c * 3 + 1]; const db = b - centroids[c * 3 + 2];
      const d = dr * dr + dg * dg + db * db; if (d < bestD) { bestD = d; best = c; }
    }
    labels[i] = best;
  }
  return { labels, centroids };
}

function traceContoursForLabel(labels: Uint16Array, width: number, height: number, label: number, minArea: number, eps: number, maxShapes: number): Array<Array<[number, number]>> {
  const visited = new Uint8Array(width * height);
  const shapes: Array<Array<[number, number]>> = [];
  const idx = (x: number, y: number) => y * width + x;

  const dirs = [ [1,0],[0,1],[-1,0],[0,-1] ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const id = idx(x, y);
      if (visited[id]) continue;
      if (labels[id] !== label) continue;
      // border pixel?
      let border = false;
      for (let k = 0; k < 4; k++) {
        const nx = x + dirs[k][0], ny = y + dirs[k][1];
        if (labels[idx(nx, ny)] !== label) { border = true; break; }
      }
      if (!border) { visited[id] = 1; continue; }

      // trace boundary using simple wall follower
      let cx = x, cy = y, dir = 0;
      const pts: Array<[number, number]> = [];
      const startX = x, startY = y;
      let safety = width * height * 4;
      do {
        pts.push([cx, cy]);
        visited[idx(cx, cy)] = 1;
        // try turn left; else straight; else right; else back
        let turned = false;
        for (let t = -1; t <= 2; t++) {
          const nd = (dir + t + 4) % 4;
          const nx = cx + dirs[nd][0], ny = cy + dirs[nd][1];
          if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
          if (labels[idx(nx, ny)] === label) {
            cx = nx; cy = ny; dir = nd; turned = true; break;
          }
        }
        if (!turned) break;
        if (--safety <= 0) break;
      } while (!(cx === startX && cy === startY && pts.length > 3));

      if (pts.length >= 6) {
        // approximate area via shoelace
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
          const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % pts.length];
          area += x1 * y2 - x2 * y1;
        }
        area = Math.abs(area) * 0.5;
        if (area >= minArea) {
          shapes.push(rdpSimplify(pts, eps));
          if (shapes.length >= maxShapes) return shapes;
        }
      }
    }
  }
  return shapes;
}

function toSvgD(points: Array<[number, number]>, scaleX: number, scaleY: number): string {
  if (points.length === 0) return '';
  let d = `M ${points[0][0]*scaleX} ${points[0][1]*scaleY}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i][0]*scaleX} ${points[i][1]*scaleY}`;
  d += ' Z';
  return d;
}

self.onmessage = (e: MessageEvent<VectorizeRequest>) => {
  try {
    const { imageData, options } = e.data;
    const { numColors, simplifyEpsilon, minArea, maxShapes, downscaleFactor = 1 } = options;
    const srcW = imageData.width, srcH = imageData.height;
    const ds = clamp(downscaleFactor, 0.25, 1);
    const w = Math.max(16, Math.floor(srcW * ds));
    const h = Math.max(16, Math.floor(srcH * ds));

    // Downscale
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    const tmp = new ImageData(w, h);
    // simple box downscale
    const sx = srcW / w, sy = srcH / h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcX = Math.floor(x * sx), srcY = Math.floor(y * sy);
        const sidx = (srcY * srcW + srcX) * 4;
        const didx = (y * w + x) * 4;
        tmp.data[didx] = imageData.data[sidx];
        tmp.data[didx + 1] = imageData.data[sidx + 1];
        tmp.data[didx + 2] = imageData.data[sidx + 2];
        tmp.data[didx + 3] = 255;
      }
    }
    ctx.putImageData(tmp, 0, 0);
    const dsImg = ctx.getImageData(0, 0, w, h);

    const { labels, centroids } = kmeansQuantize(dsImg.data, w, h, numColors);

    const scaleX = srcW / w, scaleY = srcH / h;
    const shapes: PathShape[] = [];
    let produced = 0;
    for (let c = 0; c < numColors; c++) {
      if (produced >= maxShapes) break;
      const contours = traceContoursForLabel(labels, w, h, c, minArea / (scaleX * scaleY), simplifyEpsilon, maxShapes - produced);
      const r = Math.round(centroids[c * 3]);
      const g = Math.round(centroids[c * 3 + 1]);
      const b = Math.round(centroids[c * 3 + 2]);
      const fill = `rgb(${r},${g},${b})`;
      for (const poly of contours) {
        const d = toSvgD(poly, scaleX, scaleY);
        let area = 0;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i]; const [x2, y2] = poly[(i + 1) % poly.length];
          area += (x1 * scaleX) * (y2 * scaleY) - (x2 * scaleX) * (y1 * scaleY);
        }
        area = Math.abs(area) * 0.5;
        const points = poly.map(([px, py]) => [px * scaleX, py * scaleY] as [number, number]);
        shapes.push({ d, fill, area, points });
        produced++;
        if (produced >= maxShapes) break;
      }
    }

    // Sort large to small for nicer layering
    shapes.sort((a, b) => b.area - a.area);
    self.postMessage({ status: 'complete', shapes });
  } catch (err: any) {
    self.postMessage({ status: 'error', error: err?.message || 'vectorize failed' });
  }
};


