// (fflate reserved for future gzip support)

export interface TriangleSplatGeometry {
  vertices: Float32Array;
  colors: Uint8Array;
  indices: Uint32Array;
}

export interface TriangleSplatStats {
  vertexCount: number;
  faceCount: number;
  loadingProgress?: number;
}

/**
 * Load Triangle Splatting Format (.tsf) optionally zstd-compressed (.tsf.zst)
 * @param url remote or objectURL
 * @param onProgress callback receives bytesLoaded / total
 */
export async function loadTSF(
  url: string,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ geometry: TriangleSplatGeometry; stats: TriangleSplatStats }> {
  const isZst = url.endsWith('.zst');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  const total = Number(resp.headers.get('Content-Length')) || undefined;
  const reader = resp.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported in this browser');
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(received, total);
    }
  }
  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  const buffer = isZst ? await decompressZstd(combined) : combined.buffer;
  const geom = parseTSF(buffer);
  return {
    geometry: geom,
    stats: {
      vertexCount: geom.vertices.length / 3,
      faceCount: geom.indices.length / 3,
      loadingProgress: 100,
    },
  };
}

function parseTSF(buffer: ArrayBuffer): TriangleSplatGeometry {
  const header = new Uint32Array(buffer, 0, 2);
  const numVertices = header[0];
  const numFaces = header[1];
  const vertexOffset = 8;
  const colorOffset = vertexOffset + numVertices * 3 * 4;
  const rawIndexOffset = colorOffset + numVertices * 3; // may not be 4-byte aligned
  const indexOffset = rawIndexOffset % 4 === 0 ? rawIndexOffset : rawIndexOffset + (4 - (rawIndexOffset % 4));

  // Copy aligned vertices into new Float32Array (guaranteed multiple of 4)
  const vertices = new Float32Array(buffer.slice(vertexOffset, vertexOffset + numVertices * 12));
  const colors = new Uint8Array(buffer.slice(colorOffset, colorOffset + numVertices * 3));
  const indices = new Uint32Array(buffer, indexOffset, numFaces * 3);
  return { vertices, colors, indices };
}

async function decompressZstd(_data: Uint8Array): Promise<ArrayBuffer> {
  // at the moment we only have fflate; in future swap to actual zstd wasm
  // fflate cannot decompress zstd, so we throw
  throw new Error('Zstd decompression not yet implemented in browser.');
} 