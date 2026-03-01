export interface OFFGeometry {
  vertices: Float32Array;
  colors: Uint8Array | null;
  indices: Uint32Array;
  hasColors: boolean;
}

export interface OFFStats {
  vertexCount: number;
  faceCount: number;
  loadingProgress?: number;
  hasColors: boolean;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

/**
 * Parse .off file format (Object File Format)
 * Supports both standard OFF and COFF (colored OFF) formats
 * Format:
 * OFF
 * numVertices numFaces numEdges
 * x y z [r g b]
 * ...
 * n v1 v2 v3 ... [r g b a]
 * ...
 */
export async function loadOFF(
  url: string,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ geometry: OFFGeometry; stats: OFFStats }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const total = Number(response.headers.get('Content-Length')) || undefined;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const decoder = new TextDecoder();
  let text = '';
  let received = 0;

  // Read the entire file with better memory management
  console.log('Starting to read OFF file...');
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(decoder.decode(value, { stream: true }));
      received += value.length;
      onProgress?.(received, total);
    }
  }
  text = chunks.join('');
  console.log(`OFF file read complete. Size: ${text.length} bytes`);

  // Parse the OFF file
  const lines = text.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  // Check header
  const header = lines[0].trim();
  const isColoredFormat = header === 'COFF' || header === 'CNOFF';
  if (header !== 'OFF' && header !== 'COFF' && header !== 'NOFF' && header !== 'CNOFF') {
    throw new Error(`Unsupported format: ${header}`);
  }

  // Parse counts
  const counts = lines[1].trim().split(/\s+/).map(Number);
  const numVertices = counts[0];
  const numFaces = counts[1];
  console.log(`OFF file header: ${header}, vertices: ${numVertices}, faces: ${numFaces}`);

  // Parse vertices
  const vertices = new Float32Array(numVertices * 3);
  let vertexColors: Uint8Array | null = null;
  let hasVertexColors = false;

  const bounds = {
    min: [Infinity, Infinity, Infinity] as [number, number, number],
    max: [-Infinity, -Infinity, -Infinity] as [number, number, number]
  };

  let lineIndex = 2;
  console.log(`Starting to parse ${numVertices} vertices...`);
  const startTime = Date.now();
  
  // First, check vertex format by looking at the first vertex line
  const firstVertexParts = lines[lineIndex].trim().split(/\s+/);
  const hasVertexColorsInFile = firstVertexParts.length >= 6;
  
  if (hasVertexColorsInFile) {
    vertexColors = new Uint8Array(numVertices * 3);
    hasVertexColors = true;
  }
  
  // Parse all vertices
  for (let i = 0; i < numVertices; i++) {
    if (i % 100000 === 0 && i > 0) {
      console.log(`Parsed ${i}/${numVertices} vertices...`);
    }
    
    const parts = lines[lineIndex++].trim().split(/\s+/);
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    const z = parseFloat(parts[2]);

    vertices[i * 3] = x;
    vertices[i * 3 + 1] = y;
    vertices[i * 3 + 2] = z;

    // Update bounds
    bounds.min[0] = Math.min(bounds.min[0], x);
    bounds.min[1] = Math.min(bounds.min[1], y);
    bounds.min[2] = Math.min(bounds.min[2], z);
    bounds.max[0] = Math.max(bounds.max[0], x);
    bounds.max[1] = Math.max(bounds.max[1], y);
    bounds.max[2] = Math.max(bounds.max[2], z);

    // Handle vertex colors if present
    if (hasVertexColorsInFile && vertexColors && parts.length >= 6) {
      const r = parseFloat(parts[3]);
      const g = parseFloat(parts[4]);
      const b = parseFloat(parts[5]);
      
      // Check if colors are in float format (0.0-1.0) or integer format (0-255)
      if (r <= 1.0 && g <= 1.0 && b <= 1.0) {
        // Float format - convert to 0-255
        vertexColors[i * 3] = Math.round(r * 255);
        vertexColors[i * 3 + 1] = Math.round(g * 255);
        vertexColors[i * 3 + 2] = Math.round(b * 255);
      } else {
        // Integer format
        vertexColors[i * 3] = Math.round(r);
        vertexColors[i * 3 + 1] = Math.round(g);
        vertexColors[i * 3 + 2] = Math.round(b);
      }
    }
  }

  console.log(`Starting to parse ${numFaces} faces...`);
  
  // Parse faces (triangulate if needed)
  const indices: number[] = [];
  let faceColors: number[][] = [];
  let hasFaceColors = false;

  // Check if we have face colors by looking at the first face
  const firstFaceParts = lines[lineIndex].trim().split(/\s+/);
  const firstFaceVertexCount = parseInt(firstFaceParts[0]);
  hasFaceColors = firstFaceParts.length > firstFaceVertexCount + 1;
  
  if (hasFaceColors && isColoredFormat) {
    console.log('Detected face colors in COFF file');
  }

  // Parse all faces
  const faceToTriangle: number[] = []; // Maps each triangle to its original face
  
  for (let i = 0; i < numFaces; i++) {
    if (i % 100000 === 0 && i > 0) {
      console.log(`Parsed ${i}/${numFaces} faces...`);
    }
    
    const parts = lines[lineIndex++].trim().split(/\s+/);
    const faceVertexCount = parseInt(parts[0]);

    // Store face colors if present
    let faceColor: number[] | null = null;
    if (hasFaceColors && parts.length > faceVertexCount + 1) {
      const colorStartIdx = faceVertexCount + 1;
      if (parts.length >= colorStartIdx + 3) {
        const r = parseFloat(parts[colorStartIdx]);
        const g = parseFloat(parts[colorStartIdx + 1]);
        const b = parseFloat(parts[colorStartIdx + 2]);
        // Note: parts[colorStartIdx + 3] would be alpha if present
        
        faceColor = [r, g, b];
      }
    }

    // Triangulate faces (fan triangulation)
    for (let j = 1; j < faceVertexCount - 1; j++) {
      indices.push(parseInt(parts[1]));
      indices.push(parseInt(parts[j + 1]));
      indices.push(parseInt(parts[j + 2]));
      faceToTriangle.push(i); // Map this triangle to face i
      if (faceColor) {
        faceColors.push(faceColor);
      }
    }
  }

  // Convert face colors to vertex colors if needed
  let colors = vertexColors;
  
  if (!hasVertexColors && hasFaceColors && faceColors.length > 0) {
    console.log('Converting face colors to vertex colors...');
    // Create vertex colors from face colors
    colors = new Uint8Array(numVertices * 3);
    const vertexColorAccum = new Float32Array(numVertices * 3);
    const vertexFaceCount = new Uint32Array(numVertices);
    
    // Accumulate colors for each vertex from all adjacent faces
    for (let i = 0; i < indices.length; i += 3) {
      const triangleIdx = Math.floor(i / 3);
      const faceColor = faceColors[triangleIdx];
      if (!faceColor) continue;
      
      const v1 = indices[i];
      const v2 = indices[i + 1];
      const v3 = indices[i + 2];
      
      // Get face color
      let r = faceColor[0];
      let g = faceColor[1];
      let b = faceColor[2];
      
      // Normalize to 0-255 range if needed
      if (r <= 1.0 && g <= 1.0 && b <= 1.0) {
        r *= 255;
        g *= 255;
        b *= 255;
      }
      
      // Add face color to each vertex
      for (const v of [v1, v2, v3]) {
        if (v < numVertices) {
          vertexColorAccum[v * 3] += r;
          vertexColorAccum[v * 3 + 1] += g;
          vertexColorAccum[v * 3 + 2] += b;
          vertexFaceCount[v]++;
        }
      }
    }

    // Average the colors and store in final array
    for (let i = 0; i < numVertices; i++) {
      if (vertexFaceCount[i] > 0) {
        colors[i * 3] = Math.min(255, Math.round(vertexColorAccum[i * 3] / vertexFaceCount[i]));
        colors[i * 3 + 1] = Math.min(255, Math.round(vertexColorAccum[i * 3 + 1] / vertexFaceCount[i]));
        colors[i * 3 + 2] = Math.min(255, Math.round(vertexColorAccum[i * 3 + 2] / vertexFaceCount[i]));
      } else {
        // Default color for vertices with no faces
        colors[i * 3] = 128;
        colors[i * 3 + 1] = 128;
        colors[i * 3 + 2] = 128;
      }
    }
    
    hasVertexColors = true;
    console.log('Face color conversion complete');
  }
  
  // If still no colors, generate natural garden colors based on geometry
  if (!hasVertexColors || !colors) {
    console.log('Generating natural garden colors based on vertex positions...');
    colors = new Uint8Array(numVertices * 3);
    
    // Calculate ranges for better color mapping
    const heightRange = bounds.max[1] - bounds.min[1];
    const xRange = bounds.max[0] - bounds.min[0];
    const zRange = bounds.max[2] - bounds.min[2];
    const centerX = (bounds.min[0] + bounds.max[0]) / 2;
    const centerZ = (bounds.min[2] + bounds.max[2]) / 2;
    
    for (let i = 0; i < numVertices; i++) {
      const x = vertices[i * 3];
      const y = vertices[i * 3 + 1];
      const z = vertices[i * 3 + 2];
      
      // Normalize height to 0-1
      const heightNorm = heightRange > 0 ? (y - bounds.min[1]) / heightRange : 0.5;
      
      // Distance from center for variation
      const distFromCenter = Math.sqrt(
        Math.pow((x - centerX) / xRange, 2) + 
        Math.pow((z - centerZ) / zRange, 2)
      );
      
      let r, g, b;
      
      if (heightNorm < 0.05) {
        // Ground level - soil browns
        r = 90 + Math.random() * 30; // 90-120
        g = 60 + Math.random() * 20; // 60-80
        b = 40 + Math.random() * 20; // 40-60
      } else if (heightNorm < 0.3) {
        // Low vegetation - grass greens
        r = 50 + Math.random() * 40; // 50-90
        g = 100 + Math.random() * 55; // 100-155
        b = 40 + Math.random() * 30; // 40-70
      } else if (heightNorm < 0.6) {
        // Mid level - bushes and leaves
        r = 60 + Math.random() * 60; // 60-120
        g = 120 + Math.random() * 60; // 120-180
        b = 50 + Math.random() * 40; // 50-90
      } else if (heightNorm < 0.85) {
        // Tree canopy - darker greens
        r = 40 + Math.random() * 40; // 40-80
        g = 80 + Math.random() * 60; // 80-140
        b = 30 + Math.random() * 30; // 30-60
      } else {
        // Top level - flowers and highlights
        const flowerChance = Math.random();
        if (flowerChance < 0.2) {
          // Flowers - vibrant colors
          const hue = Math.random();
          const sat = 0.7 + Math.random() * 0.3;
          const lum = 0.5 + Math.random() * 0.3;
          const rgb = hslToRgb(hue, sat, lum);
          r = rgb[0] * 255;
          g = rgb[1] * 255;
          b = rgb[2] * 255;
        } else {
          // Light foliage
          r = 100 + Math.random() * 80; // 100-180
          g = 140 + Math.random() * 80; // 140-220
          b = 70 + Math.random() * 50; // 70-120
        }
      }
      
      // Add variation based on position
      const noiseX = Math.sin(x * 0.05) * 15;
      const noiseZ = Math.cos(z * 0.05) * 15;
      const noise = noiseX + noiseZ;
      
      r = Math.max(0, Math.min(255, r + noise));
      g = Math.max(0, Math.min(255, g + noise * 0.8));
      b = Math.max(0, Math.min(255, b + noise * 0.6));
      
      colors[i * 3] = Math.round(r);
      colors[i * 3 + 1] = Math.round(g);
      colors[i * 3 + 2] = Math.round(b);
    }
    hasVertexColors = true;
  }

  const parseTime = Date.now() - startTime;
  console.log(`OFF file parsing complete in ${parseTime}ms`);
  console.log(`Loaded: ${numVertices} vertices, ${indices.length / 3} triangles`);
  console.log(`Bounds: min(${bounds.min.map(v => v.toFixed(2)).join(', ')}), max(${bounds.max.map(v => v.toFixed(2)).join(', ')})`);
  console.log(`Colors: ${hasVertexColorsInFile ? 'vertex colors from file' : hasFaceColors ? 'face colors converted to vertex colors' : 'generated natural garden colors'}`);

  return {
    geometry: {
      vertices,
      colors,
      indices: new Uint32Array(indices),
      hasColors: true // Always true now since we generate colors if missing
    },
    stats: {
      vertexCount: numVertices,
      faceCount: indices.length / 3,
      loadingProgress: 100,
      hasColors: true,
      bounds
    }
  };
}

/**
 * Create a simple colored .off file for testing
 */
export function createTestOFF(): string {
  return `COFF
8 6 0
-1 -1 -1 255 0 0
1 -1 -1 0 255 0
1 1 -1 0 0 255
-1 1 -1 255 255 0
-1 1 1 255 0 255
1 -1 1 0 255 255
1 1 1 128 128 128
-1 1 1 255 255 255
4 0 1 2 3
4 4 5 6 7
4 0 1 5 4
4 1 2 6 5
4 2 3 7 6
4 3 0 4 7`;
} 