export interface PLYGeometry {
  vertices: Float32Array;
  colors: Uint8Array | null;
  indices: Uint32Array;
  hasColors: boolean;
  normals: Float32Array | null;
  hasNormals: boolean;
}

export interface PLYStats {
  vertexCount: number;
  faceCount: number;
  loadingProgress?: number;
  hasColors: boolean;
  hasNormals: boolean;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

/**
 * Custom PLY loader for Triangle Splatting
 * Handles both ASCII and binary PLY formats
 */
export async function loadPLY(
  url: string,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ geometry: PLYGeometry; stats: PLYStats }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const total = Number(response.headers.get('Content-Length')) || undefined;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(received, total);
    }
  }

  // Combine chunks
  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Parse PLY header
  const decoder = new TextDecoder();
  const headerEndIndex = findHeaderEnd(buffer);
  const headerText = decoder.decode(buffer.slice(0, headerEndIndex));
  const header = parsePLYHeader(headerText);

  // Parse body based on format
  const bodyStart = headerEndIndex;
  const body = buffer.slice(bodyStart);
  
  let geometry: PLYGeometry;
  if (header.format === 'ascii') {
    geometry = parsePLYAscii(decoder.decode(body), header);
  } else {
    geometry = parsePLYBinary(body, header);
  }

  const stats: PLYStats = {
    vertexCount: header.vertexCount,
    faceCount: header.faceCount,
    loadingProgress: 100,
    hasColors: geometry.hasColors,
    hasNormals: geometry.hasNormals,
    bounds: calculateBounds(geometry.vertices)
  };

  return { geometry, stats };
}

function findHeaderEnd(buffer: Uint8Array): number {
  const searchString = 'end_header\n';
  const searchBytes = new TextEncoder().encode(searchString);
  
  for (let i = 0; i < buffer.length - searchBytes.length; i++) {
    let match = true;
    for (let j = 0; j < searchBytes.length; j++) {
      if (buffer[i + j] !== searchBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i + searchBytes.length;
    }
  }
  throw new Error('PLY header end not found');
}

interface PLYHeader {
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
  vertexCount: number;
  faceCount: number;
  vertexProperties: Array<{ name: string; type: string }>;
  faceProperties: Array<{ name: string; type: string; listType?: string }>;
}

function parsePLYHeader(headerText: string): PLYHeader {
  const lines = headerText.split('\n').filter(line => line.trim());
  const header: PLYHeader = {
    format: 'ascii',
    vertexCount: 0,
    faceCount: 0,
    vertexProperties: [],
    faceProperties: []
  };

  let currentElement = '';
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    
    if (parts[0] === 'format') {
      header.format = parts[1] as PLYHeader['format'];
    } else if (parts[0] === 'element') {
      currentElement = parts[1];
      if (currentElement === 'vertex') {
        header.vertexCount = parseInt(parts[2]);
      } else if (currentElement === 'face') {
        header.faceCount = parseInt(parts[2]);
      }
    } else if (parts[0] === 'property') {
      if (currentElement === 'vertex') {
        if (parts[1] === 'list') {
          // Skip list properties for vertices
        } else {
          header.vertexProperties.push({
            name: parts[2],
            type: parts[1]
          });
        }
      } else if (currentElement === 'face') {
        if (parts[1] === 'list') {
          header.faceProperties.push({
            name: parts[4],
            type: parts[3],
            listType: parts[2]
          });
        } else {
          header.faceProperties.push({
            name: parts[2],
            type: parts[1]
          });
        }
      }
    }
  }

  return header;
}

function parsePLYAscii(bodyText: string, header: PLYHeader): PLYGeometry {
  const lines = bodyText.trim().split('\n').filter(line => line.trim());
  
  const vertices = new Float32Array(header.vertexCount * 3);
  let colors: Uint8Array | null = null;
  let normals: Float32Array | null = null;
  
  // Check for color and normal properties
  const hasColorProps = header.vertexProperties.some(p => 
    ['red', 'r'].includes(p.name) || ['green', 'g'].includes(p.name) || ['blue', 'b'].includes(p.name)
  );
  const hasNormalProps = header.vertexProperties.some(p => 
    ['nx', 'normal_x'].includes(p.name) || ['ny', 'normal_y'].includes(p.name) || ['nz', 'normal_z'].includes(p.name)
  );
  
  if (hasColorProps) {
    colors = new Uint8Array(header.vertexCount * 3);
  }
  if (hasNormalProps) {
    normals = new Float32Array(header.vertexCount * 3);
  }

  // Property indices
  const propIndices: { [key: string]: number } = {};
  header.vertexProperties.forEach((prop, index) => {
    propIndices[prop.name] = index;
  });

  // Parse vertices
  for (let i = 0; i < header.vertexCount; i++) {
    const parts = lines[i].trim().split(/\s+/);
    
    // Position - handle different precision values
    const x = parseFloat(parts[propIndices['x'] || 0]);
    const y = parseFloat(parts[propIndices['y'] || 1]);
    const z = parseFloat(parts[propIndices['z'] || 2]);
    
    // Clamp extreme values to prevent overflow
    vertices[i * 3] = isFinite(x) ? Math.max(-1e10, Math.min(1e10, x)) : 0;
    vertices[i * 3 + 1] = isFinite(y) ? Math.max(-1e10, Math.min(1e10, y)) : 0;
    vertices[i * 3 + 2] = isFinite(z) ? Math.max(-1e10, Math.min(1e10, z)) : 0;
    
    // Colors
    if (colors) {
      const rIdx = propIndices['red'] ?? propIndices['r'];
      const gIdx = propIndices['green'] ?? propIndices['g'];
      const bIdx = propIndices['blue'] ?? propIndices['b'];
      
      if (rIdx !== undefined && gIdx !== undefined && bIdx !== undefined) {
        const r = parseFloat(parts[rIdx]);
        const g = parseFloat(parts[gIdx]);
        const b = parseFloat(parts[bIdx]);
        
        // Check if colors are normalized (0-1) or byte values (0-255)
        if (r <= 1.0 && g <= 1.0 && b <= 1.0) {
          colors[i * 3] = Math.round(r * 255);
          colors[i * 3 + 1] = Math.round(g * 255);
          colors[i * 3 + 2] = Math.round(b * 255);
        } else {
          colors[i * 3] = Math.round(r);
          colors[i * 3 + 1] = Math.round(g);
          colors[i * 3 + 2] = Math.round(b);
        }
      }
    }
    
    // Normals
    if (normals) {
      const nxIdx = propIndices['nx'] ?? propIndices['normal_x'];
      const nyIdx = propIndices['ny'] ?? propIndices['normal_y'];
      const nzIdx = propIndices['nz'] ?? propIndices['normal_z'];
      
      if (nxIdx !== undefined && nyIdx !== undefined && nzIdx !== undefined) {
        normals[i * 3] = parseFloat(parts[nxIdx]);
        normals[i * 3 + 1] = parseFloat(parts[nyIdx]);
        normals[i * 3 + 2] = parseFloat(parts[nzIdx]);
      }
    }
  }

  // Parse faces
  const indices: number[] = [];
  const faceStartLine = header.vertexCount;
  
  for (let i = 0; i < header.faceCount; i++) {
    const parts = lines[faceStartLine + i].trim().split(/\s+/).map(Number);
    const vertexCount = parts[0];
    
    // Triangulate using fan method
    for (let j = 1; j < vertexCount - 1; j++) {
      indices.push(parts[1]);
      indices.push(parts[j + 1]);
      indices.push(parts[j + 2]);
    }
  }

  return {
    vertices,
    colors,
    indices: new Uint32Array(indices),
    hasColors: colors !== null,
    normals,
    hasNormals: normals !== null
  };
}

function parsePLYBinary(body: Uint8Array, header: PLYHeader): PLYGeometry {
  const isLittleEndian = header.format === 'binary_little_endian';
  const dataView = new DataView(body.buffer, body.byteOffset, body.byteLength);
  
  const vertices = new Float32Array(header.vertexCount * 3);
  let colors: Uint8Array | null = null;
  let normals: Float32Array | null = null;
  
  // Calculate vertex stride
  let vertexStride = 0;
  const propOffsets: { [key: string]: number } = {};
  const propTypes: { [key: string]: string } = {};
  
  header.vertexProperties.forEach(prop => {
    propOffsets[prop.name] = vertexStride;
    propTypes[prop.name] = prop.type;
    
    switch (prop.type) {
      case 'float':
      case 'float32':
        vertexStride += 4;
        break;
      case 'double':
      case 'float64':
        vertexStride += 8;
        break;
      case 'uchar':
      case 'uint8':
        vertexStride += 1;
        break;
      case 'ushort':
      case 'uint16':
        vertexStride += 2;
        break;
      case 'int':
      case 'int32':
      case 'uint':
      case 'uint32':
        vertexStride += 4;
        break;
    }
  });
  
  // Check for color and normal properties
  const hasColorProps = 'red' in propOffsets || 'r' in propOffsets;
  const hasNormalProps = 'nx' in propOffsets || 'normal_x' in propOffsets;
  
  if (hasColorProps) {
    colors = new Uint8Array(header.vertexCount * 3);
  }
  if (hasNormalProps) {
    normals = new Float32Array(header.vertexCount * 3);
  }
  
  // Parse vertices
  let offset = 0;
  for (let i = 0; i < header.vertexCount; i++) {
    // Position - handle different precision values
    const x = dataView.getFloat32(offset + (propOffsets['x'] || 0), isLittleEndian);
    const y = dataView.getFloat32(offset + (propOffsets['y'] || 4), isLittleEndian);
    const z = dataView.getFloat32(offset + (propOffsets['z'] || 8), isLittleEndian);
    
    // Clamp extreme values to prevent overflow
    vertices[i * 3] = isFinite(x) ? Math.max(-1e10, Math.min(1e10, x)) : 0;
    vertices[i * 3 + 1] = isFinite(y) ? Math.max(-1e10, Math.min(1e10, y)) : 0;
    vertices[i * 3 + 2] = isFinite(z) ? Math.max(-1e10, Math.min(1e10, z)) : 0;
    
    // Colors
    if (colors) {
      const rOffset = propOffsets['red'] ?? propOffsets['r'];
      const gOffset = propOffsets['green'] ?? propOffsets['g'];
      const bOffset = propOffsets['blue'] ?? propOffsets['b'];
      
      if (rOffset !== undefined && gOffset !== undefined && bOffset !== undefined) {
        const rType = propTypes['red'] ?? propTypes['r'];
        
        if (rType === 'uchar' || rType === 'uint8') {
          colors[i * 3] = dataView.getUint8(offset + rOffset);
          colors[i * 3 + 1] = dataView.getUint8(offset + gOffset);
          colors[i * 3 + 2] = dataView.getUint8(offset + bOffset);
        } else if (rType === 'float' || rType === 'float32') {
          colors[i * 3] = Math.round(dataView.getFloat32(offset + rOffset, isLittleEndian) * 255);
          colors[i * 3 + 1] = Math.round(dataView.getFloat32(offset + gOffset, isLittleEndian) * 255);
          colors[i * 3 + 2] = Math.round(dataView.getFloat32(offset + bOffset, isLittleEndian) * 255);
        }
      }
    }
    
    // Normals
    if (normals) {
      const nxOffset = propOffsets['nx'] ?? propOffsets['normal_x'];
      const nyOffset = propOffsets['ny'] ?? propOffsets['normal_y'];
      const nzOffset = propOffsets['nz'] ?? propOffsets['normal_z'];
      
      if (nxOffset !== undefined && nyOffset !== undefined && nzOffset !== undefined) {
        normals[i * 3] = dataView.getFloat32(offset + nxOffset, isLittleEndian);
        normals[i * 3 + 1] = dataView.getFloat32(offset + nyOffset, isLittleEndian);
        normals[i * 3 + 2] = dataView.getFloat32(offset + nzOffset, isLittleEndian);
      }
    }
    
    offset += vertexStride;
  }
  
  // Parse faces
  const indices: number[] = [];
  
  for (let i = 0; i < header.faceCount; i++) {
    const vertexCount = dataView.getUint8(offset);
    offset += 1;
    
    const faceIndices: number[] = [];
    for (let j = 0; j < vertexCount; j++) {
      faceIndices.push(dataView.getUint32(offset, isLittleEndian));
      offset += 4;
    }
    
    // Triangulate using fan method
    for (let j = 1; j < vertexCount - 1; j++) {
      indices.push(faceIndices[0]);
      indices.push(faceIndices[j]);
      indices.push(faceIndices[j + 1]);
    }
  }
  
  return {
    vertices,
    colors,
    indices: new Uint32Array(indices),
    hasColors: colors !== null,
    normals,
    hasNormals: normals !== null
  };
}

function calculateBounds(vertices: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const bounds = {
    min: [Infinity, Infinity, Infinity] as [number, number, number],
    max: [-Infinity, -Infinity, -Infinity] as [number, number, number]
  };
  
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    
    // Only update bounds with finite values
    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      bounds.min[0] = Math.min(bounds.min[0], x);
      bounds.min[1] = Math.min(bounds.min[1], y);
      bounds.min[2] = Math.min(bounds.min[2], z);
      bounds.max[0] = Math.max(bounds.max[0], x);
      bounds.max[1] = Math.max(bounds.max[1], y);
      bounds.max[2] = Math.max(bounds.max[2], z);
    }
  }
  
  // If no valid bounds found, use default
  if (!isFinite(bounds.min[0])) {
    bounds.min = [-1, -1, -1];
    bounds.max = [1, 1, 1];
  }
  
  return bounds;
}

// Export PLYLoader class for compatibility with the import
export const PLYLoader = {
  loadPLY
}; 