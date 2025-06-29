import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface ViewerControls {
  fov: number;
  rotationSpeed: number;
  enableRotation: boolean;
  quality: 'low' | 'medium' | 'high';
  renderMode: 'triangles' | 'points' | 'wireframe';
}

interface SceneStats {
  triangles: number;
  vertices: number;
  fileSize: number;
  format: string;
  renderTime: number;
}

// Simple Matrix and Vector Math Utilities
const mat4 = {
  perspective: (fov: number, aspect: number, near: number, far: number) => {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  },
  lookAt: (cameraPosition: number[], target: number[], up: number[]) => {
    const zAxis = [
      cameraPosition[0] - target[0],
      cameraPosition[1] - target[1],
      cameraPosition[2] - target[2]
    ];
    let len = zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2];
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      zAxis[0] *= len;
      zAxis[1] *= len;
      zAxis[2] *= len;
    }

    const xAxis = [
      up[1] * zAxis[2] - up[2] * zAxis[1],
      up[2] * zAxis[0] - up[0] * zAxis[2],
      up[0] * zAxis[1] - up[1] * zAxis[0]
    ];
    len = xAxis[0] * xAxis[0] + xAxis[1] * xAxis[1] + xAxis[2] * xAxis[2];
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      xAxis[0] *= len;
      xAxis[1] *= len;
      xAxis[2] *= len;
    }

    const yAxis = [
      zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
      zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
      zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0]
    ];
    
    return [
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -(xAxis[0] * cameraPosition[0] + xAxis[1] * cameraPosition[1] + xAxis[2] * cameraPosition[2]),
      -(yAxis[0] * cameraPosition[0] + yAxis[1] * cameraPosition[1] + yAxis[2] * cameraPosition[2]),
      -(zAxis[0] * cameraPosition[0] + zAxis[1] * cameraPosition[1] + zAxis[2] * cameraPosition[2]),
      1
    ];
  }
};

const TriangleSplattingPage: React.FC = () => {
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [sceneStats, setSceneStats] = useState<SceneStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [camera, setCamera] = useState({
    phi: Math.PI / 2,
    theta: Math.PI / 2,
    distance: 5,
    target: [0, 0, 0]
  });

  const [controls, setControls] = useState<ViewerControls>({
    fov: 75,
    rotationSpeed: 1,
    enableRotation: true,
    quality: 'high',
    renderMode: 'triangles'
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const sceneDataRef = useRef<{ vertices: Float32Array; colors: Uint8Array; indices?: Uint32Array } | null>(null);
  const cameraRef = useRef(camera);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // Animated background grid effect
  const GridBackground = () => (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <div className="absolute inset-0" 
           style={{
             backgroundImage: `
               linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
             `,
             backgroundSize: '20px 20px'
           }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)'
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );

  // Scanning line effect
  const ScanningLines = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-60"
        animate={{ y: ['-100%', '100vh'] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-40"
        animate={{ y: ['-100%', '100vh'] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          delay: 1.5
        }}
      />
    </div>
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      setError(null);
      loadTriangleSplattingFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/octet-stream': ['.splat', '.ply', '.off'],
      'text/plain': ['.off'],
      'model/ply': ['.ply']
    },
    multiple: false,
    disabled: isLoading,
  });

  const loadTriangleSplattingFile = async (file: File) => {
    setIsLoading(true);
    setLoadProgress(0);
    setSceneLoaded(false);

    try {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setLoadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      
      let vertices: Float32Array = new Float32Array();
      let colors: Uint8Array = new Uint8Array();
      let indices: Uint32Array = new Uint32Array();
      
      if (file.name.endsWith('.ply')) {
        const data = parsePLY(arrayBuffer);
        vertices = data.vertices;
        colors = data.colors;
        // Note: PLY parser here doesn't extract faces, so we can't render triangles yet.
      } else if (file.name.endsWith('.off')) {
        const data = parseOFF(arrayBuffer);
        vertices = data.vertices;
        colors = data.colors;
        indices = data.indices;
      } else if (file.name.endsWith('.splat')) {
        throw new Error('.splat file format not yet supported. Please use .ply or .off');
      }

      sceneDataRef.current = { vertices, colors, indices };

      // Generate scene stats
      setSceneStats({
        triangles: indices.length / 3,
        vertices: vertices.length / 3,
        fileSize: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        renderTime: 0 // Will be updated in render loop
      });

      clearInterval(progressInterval);
      setLoadProgress(100);

      // Initialize 3D viewer
      initializeViewer();
      
      setTimeout(() => {
        setSceneLoaded(true);
        setIsLoading(false);
      }, 500);

    } catch (err) {
      setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
      setLoadProgress(0);
    }
  };

  const parsePLY = (arrayBuffer: ArrayBuffer) => {
    const headerText = new TextDecoder().decode(arrayBuffer.slice(0, 1024));
    const headerEndIndex = headerText.indexOf('end_header') + 'end_header'.length + 1;
    const header = headerText.substring(0, headerEndIndex);
    const lines = header.split('\n');

    let vertexCount = 0;
    let properties: { type: string; name: string; size: number }[] = [];
    let format: 'ascii' | 'binary_little_endian' | 'binary_big_endian' = 'ascii';
    let isVertexElement = false;

    // Detailed header parsing
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'format') {
            format = parts[1] as any;
        } else if (parts[0] === 'element' && parts[1] === 'vertex') {
            vertexCount = parseInt(parts[2]);
            isVertexElement = true;
        } else if (parts[0] === 'element') {
            isVertexElement = false;
        } else if (parts[0] === 'property' && isVertexElement) {
            const [_, type, name] = parts;
            let size = 0;
            if (type.startsWith('float') || type.startsWith('int32')) size = 4;
            else if (type.startsWith('uint8') || type.startsWith('uchar')) size = 1;
            else if (type.startsWith('uint16') || type.startsWith('ushort')) size = 2;
            properties.push({ type, name, size });
        } else if (parts[0] === 'end_header') {
            break;
        }
    }

    if (vertexCount === 0) throw new Error('No vertices found in PLY header.');

    const vertices = new Float32Array(vertexCount * 3);
    const colors = new Uint8Array(vertexCount * 3);
    const body = arrayBuffer.slice(headerEndIndex);

    const x_prop = properties.find(p => p.name === 'x');
    const y_prop = properties.find(p => p.name === 'y');
    const z_prop = properties.find(p => p.name === 'z');
    const r_prop = properties.find(p => ['red', 'r'].includes(p.name));
    const g_prop = properties.find(p => ['green', 'g'].includes(p.name));
    const b_prop = properties.find(p => ['blue', 'b'].includes(p.name));

    if (!x_prop || !y_prop || !z_prop) throw new Error('PLY must contain x, y, z properties.');
    const hasColor = r_prop && g_prop && b_prop;

    if (format === 'binary_little_endian' || format === 'binary_big_endian') {
        const littleEndian = format === 'binary_little_endian';
        const dataView = new DataView(body);
        let offset = 0;
        const vertexByteSize = properties.reduce((acc, p) => acc + p.size, 0);

        for (let i = 0; i < vertexCount; i++) {
            let propOffset = 0;
            let x=0, y=0, z=0, r=128, g=128, b=255;

            for (const prop of properties) {
                let value;
                try {
                    switch (prop.type) {
                        case 'float': case 'float32': value = dataView.getFloat32(offset + propOffset, littleEndian); break;
                        case 'uchar': case 'uint8': value = dataView.getUint8(offset + propOffset); break;
                        case 'ushort': case 'uint16': value = dataView.getUint16(offset + propOffset, littleEndian); break;
                        case 'int': case 'int32': value = dataView.getInt32(offset + propOffset, littleEndian); break;
                        default: value = 0;
                    }
                } catch(e) {
                    console.error(`Error reading property ${prop.name} at vertex ${i}. File might be corrupt or truncated.`);
                    continue; // Skip to next vertex
                }

                if (prop.name === x_prop.name) x = value;
                if (prop.name === y_prop.name) y = value;
                if (prop.name === z_prop.name) z = value;
                if (hasColor) {
                    if (prop.name === r_prop!.name) r = r_prop!.type === 'float' ? value * 255 : value;
                    if (prop.name === g_prop!.name) g = g_prop!.type === 'float' ? value * 255 : value;
                    if (prop.name === b_prop!.name) b = b_prop!.type === 'float' ? value * 255 : value;
                }
                propOffset += prop.size;
            }

            vertices[i * 3 + 0] = x;
            vertices[i * 3 + 1] = y;
            vertices[i * 3 + 2] = z;
            colors[i * 3 + 0] = Math.max(0, Math.min(255, r));
            colors[i * 3 + 1] = Math.max(0, Math.min(255, g));
            colors[i * 3 + 2] = Math.max(0, Math.min(255, b));
            offset += vertexByteSize;

            if (offset > dataView.byteLength) {
              console.warn(`PLY file appears truncated. Expected data for ${vertexCount} vertices, but file ended after ${i+1}.`);
              // Resize arrays to the number of vertices we actually read
              const finalVertices = new Float32Array(vertices.buffer, 0, (i + 1) * 3);
              const finalColors = new Uint8Array(colors.buffer, 0, (i + 1) * 3);
              return { vertices: finalVertices, colors: finalColors };
            }
        }
    } else { // ASCII format
        const text = new TextDecoder().decode(body);
        const lines = text.trim().split('\n');
        let successfulVertices = 0;

        for (let i = 0; i < vertexCount; i++) {
          if (i >= lines.length) {
              console.warn(`PLY file (ASCII) appears truncated. Expected ${vertexCount} vertices, processed ${i}.`);
              break;
          }
          const values = lines[i].trim().split(/\s+/);
          
          const x_idx = properties.findIndex(p => p.name === x_prop.name);
          const y_idx = properties.findIndex(p => p.name === y_prop.name);
          const z_idx = properties.findIndex(p => p.name === z_prop.name);
          const r_idx = hasColor ? properties.findIndex(p => p.name === r_prop!.name) : -1;
          const g_idx = hasColor ? properties.findIndex(p => p.name === g_prop!.name) : -1;
          const b_idx = hasColor ? properties.findIndex(p => p.name === b_prop!.name) : -1;

          if (values.length < properties.length) continue;

          const x = parseFloat(values[x_idx]);
          const y = parseFloat(values[y_idx]);
          const z = parseFloat(values[z_idx]);

          if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
          
          let r=128, g=128, b=255;
          if (hasColor) {
            const rVal = parseFloat(values[r_idx]);
            const gVal = parseFloat(values[g_idx]);
            const bVal = parseFloat(values[b_idx]);
            r = r_prop!.type === 'float' ? rVal * 255 : rVal;
            g = g_prop!.type === 'float' ? gVal * 255 : gVal;
            b = b_prop!.type === 'float' ? bVal * 255 : bVal;
          }

          vertices[successfulVertices * 3 + 0] = x;
          vertices[successfulVertices * 3 + 1] = y;
          vertices[successfulVertices * 3 + 2] = z;
          colors[successfulVertices * 3 + 0] = Math.max(0, Math.min(255, r));
          colors[successfulVertices * 3 + 1] = Math.max(0, Math.min(255, g));
          colors[successfulVertices * 3 + 2] = Math.max(0, Math.min(255, b));
          successfulVertices++;
        }
        
        if (successfulVertices < vertexCount) {
          const finalVertices = new Float32Array(vertices.buffer, 0, successfulVertices * 3);
          const finalColors = new Uint8Array(colors.buffer, 0, successfulVertices * 3);
          return { vertices: finalVertices, colors: finalColors };
        }
    }
    
    return { vertices, colors };
  };

  const parseOFF = (arrayBuffer: ArrayBuffer) => {
    const text = new TextDecoder().decode(arrayBuffer);
    const lines = text.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'));

    if (lines[0].trim() !== 'OFF') {
      // Some OFF files may have COFF for color
      if (!lines[0].trim().endsWith('OFF')) {
        throw new Error('Invalid OFF file header');
      }
    }

    const hasColor = lines[0].trim().startsWith('C');

    const [numVertices, numFaces] = lines[1].trim().split(/\s+/).map(Number);

    const vertices = new Float32Array(numVertices * 3);
    const colors = new Uint8Array(numVertices * 3);
    const indices = new Uint32Array(numFaces * 3);

    // Read vertices
    for (let i = 0; i < numVertices; i++) {
      const line = lines[i + 2].trim().split(/\s+/);
      vertices[i * 3 + 0] = parseFloat(line[0]);
      vertices[i * 3 + 1] = parseFloat(line[1]);
      vertices[i * 3 + 2] = parseFloat(line[2]);
      if (hasColor) {
        colors[i * 3 + 0] = parseInt(line[3]);
        colors[i * 3 + 1] = parseInt(line[4]);
        colors[i * 3 + 2] = parseInt(line[5]);
      } else {
        colors[i * 3 + 0] = 128;
        colors[i * 3 + 1] = 128;
        colors[i * 3 + 2] = 255;
      }
    }

    // Read faces
    for (let i = 0; i < numFaces; i++) {
      const line = lines[i + 2 + numVertices].trim().split(/\s+/).map(Number);
      // We only support triangles, so we assume the first value is 3
      if (line[0] !== 3) {
        console.warn(`Skipping non-triangular face on line ${i + 3 + numVertices}`);
        continue;
      }
      indices[i * 3 + 0] = line[1];
      indices[i * 3 + 1] = line[2];
      indices[i * 3 + 2] = line[3];
    }
    
    return { vertices, colors, indices };
  };

  const initializeViewer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) || canvas.getContext('webgl', { powerPreference: 'high-performance' });
    if (!gl) {
      setError('WebGL is not supported on your browser.');
      return;
    }
    glRef.current = gl;

    const vertexShaderSource = `
      attribute vec4 a_position;
      attribute vec3 a_color;
      uniform mat4 u_projection;
      uniform mat4 u_view;
      varying vec3 v_color;
      void main() {
        gl_Position = u_projection * u_view * a_position;
        gl_PointSize = 2.0;
        v_color = a_color;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 v_color;
      void main() {
        gl_FragColor = vec4(v_color, 1.0);
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Could not create shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Error compiling shader');
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    if (!program) throw new Error('Could not create program');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Error linking program');
    }
    gl.useProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    const projectionUniformLocation = gl.getUniformLocation(program, "u_projection");
    const viewUniformLocation = gl.getUniformLocation(program, "u_view");

    const { vertices, colors, indices } = sceneDataRef.current!;
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    let indexBuffer: WebGLBuffer | null = null;
    if (indices && indices.length > 0) {
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      if (e.button === 2 || e.ctrlKey || e.metaKey) {
        isPanningRef.current = true;
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isPanningRef.current) {
        setCamera(prev => {
          const cam = cameraRef.current;
          const panSpeed = 0.01;
          const right = [Math.cos(cam.theta), 0, -Math.sin(cam.theta)];
          const up = [0, 1, 0];
          const panX = right.map(v => v * -dx * panSpeed);
          const panY = up.map(v => v * dy * panSpeed);
          const newTarget = cam.target.map((v, i) => v + panX[i] + panY[i]);
          return { ...prev, target: newTarget };
        });
      } else {
        setCamera(prev => ({
          ...prev,
          theta: prev.theta - dx * 0.01,
          phi: Math.max(0.1, Math.min(Math.PI - 0.1, prev.phi - dy * 0.01))
        }));
      }
    };

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      setCamera(prev => ({
        ...prev,
        distance: Math.max(1, prev.distance + e.deltaY * 0.01)
      }));
    };
    
    canvas.addEventListener('mousedown', handleMouseDown as any);
    canvas.addEventListener('mouseup', handleMouseUp as any);
    canvas.addEventListener('mousemove', handleMouseMove as any);
    canvas.addEventListener('wheel', handleWheel as any);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    const renderScene = () => {
      const gl = glRef.current;
      if (!gl) return;
      
      const canvas = gl.canvas as HTMLCanvasElement;

      // Resize canvas if needed
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clearColor(0.05, 0.05, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(program);

      // Camera
      const cam = cameraRef.current;
      const cameraPosition = [
        cam.target[0] + cam.distance * Math.sin(cam.phi) * Math.cos(cam.theta),
        cam.target[1] + cam.distance * Math.cos(cam.phi),
        cam.target[2] + cam.distance * Math.sin(cam.phi) * Math.sin(cam.theta)
      ];
      const viewMatrix = mat4.lookAt(cameraPosition, cam.target, [0, 1, 0]);
      const projectionMatrix = mat4.perspective(controls.fov * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.1, 200);

      gl.uniformMatrix4fv(projectionUniformLocation, false, projectionMatrix);
      gl.uniformMatrix4fv(viewUniformLocation, false, viewMatrix);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.enableVertexAttribArray(colorAttributeLocation);
      gl.vertexAttribPointer(colorAttributeLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);

      if (indexBuffer && indices && indices.length > 0) {
        // Bind the index buffer before drawing
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // Use drawElements to render triangles
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
      } else {
        // Fallback to drawing points if no indices
        gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
      }

      animationFrameIdRef.current = requestAnimationFrame(renderScene);
    }
    
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    animationFrameIdRef.current = requestAnimationFrame(renderScene);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if(animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const LoadingOverlay = () => (
    <motion.div
      className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center space-y-6">
        <motion.div
          className="w-32 h-32 mx-auto relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 border-4 border-indigo-600/30 rounded-full"></div>
          <div className="absolute inset-2 border-4 border-purple-600/30 rounded-full"></div>
          <div className="absolute inset-4 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-400">{Math.round(loadProgress)}%</span>
          </div>
        </motion.div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">
            {loadProgress < 30 ? 'Parsing Triangle Data' : 
             loadProgress < 70 ? 'Initializing 3D Renderer' : 
             'Loading Scene'}
          </h3>
          <p className="text-gray-400">Processing {fileName}</p>
        </div>
        
        <div className="w-80 bg-gray-700 rounded-full h-3">
          <motion.div
            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            style={{ width: `${loadProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-950 text-white overflow-hidden">
      <GridBackground />
      <ScanningLines />
      
      <Header />

      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Triangle Splatting Viewer
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Next-generation 3D scene viewer powered by triangle-based radiance field rendering
            </p>
          </motion.div>

          {!sceneLoaded ? (
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={`relative p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                  isDragActive
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                    : 'border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/5'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="relative z-10 text-center">
                  <motion.div
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="material-symbols-outlined text-4xl text-white">view_in_ar</span>
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-2">
                    {isDragActive ? 'Drop the 3D file here...' : 'Upload Triangle Splatting Scene'}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Supports .ply and .off formats up to 100MB
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                    {[
                      { format: '.PLY', desc: 'Point cloud data with triangles' },
                      { format: '.OFF', desc: 'Object file format meshes' }
                    ].map((item, index) => (
                      <motion.div
                        key={item.format}
                        className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="text-indigo-400 font-bold">{item.format}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {[
                  { 
                    icon: 'speed', 
                    title: 'Real-time Rendering', 
                    desc: '2400+ FPS with triangle-based primitives'
                  },
                  { 
                    icon: 'high_quality', 
                    title: 'High Fidelity', 
                    desc: 'Sharp edges and fine detail preservation'
                  },
                  { 
                    icon: 'memory', 
                    title: 'GPU Optimized', 
                    desc: 'Native triangle rasterization pipeline'
                  }
                ].map((card, index) => (
                  <motion.div
                    key={card.title}
                    className="p-6 bg-gray-800/30 rounded-xl border border-gray-700 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                  >
                    <span className="material-symbols-outlined text-3xl text-indigo-400 mb-3 block">
                      {card.icon}
                    </span>
                    <h4 className="text-lg font-bold text-white mb-2">{card.title}</h4>
                    <p className="text-gray-400">{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Viewer Interface */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Controls Panel */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Scene Info */}
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <span className="material-symbols-outlined mr-2 text-indigo-400">info</span>
                    Scene Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Triangles:</span>
                      <span className="text-white font-mono">{sceneStats?.triangles.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vertices:</span>
                      <span className="text-white font-mono">{sceneStats?.vertices.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">File Size:</span>
                      <span className="text-white font-mono">{formatFileSize(sceneStats?.fileSize || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Format:</span>
                      <span className="text-indigo-400 font-mono">{sceneStats?.format}</span>
                    </div>
                  </div>
                </div>

                {/* Render Controls */}
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <span className="material-symbols-outlined mr-2 text-purple-400">tune</span>
                    Render Settings
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Render Mode */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-2">Render Mode</label>
                      <select
                        value={controls.renderMode}
                        onChange={(e) => setControls(prev => ({ ...prev, renderMode: e.target.value as any }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="triangles">Triangles</option>
                        <option value="points">Points</option>
                        <option value="wireframe">Wireframe</option>
                      </select>
                    </div>

                    {/* Quality */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-2">Quality</label>
                      <select
                        value={controls.quality}
                        onChange={(e) => setControls(prev => ({ ...prev, quality: e.target.value as any }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* FOV */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-2">
                        Field of View: {controls.fov}°
                      </label>
                      <input
                        type="range"
                        min="30"
                        max="120"
                        value={controls.fov}
                        onChange={(e) => setControls(prev => ({ ...prev, fov: Number(e.target.value) }))}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    {/* Auto Rotation */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Auto Rotation</span>
                      <button
                        onClick={() => setControls(prev => ({ ...prev, enableRotation: !prev.enableRotation }))}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          controls.enableRotation
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {controls.enableRotation ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={toggleFullscreen}
                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center space-x-2"
                  >
                    <span className="material-symbols-outlined">fullscreen</span>
                    <span>Fullscreen</span>
                  </button>
                  
                  <button
                    onClick={() => setSceneLoaded(false)}
                    className="w-full px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <span className="material-symbols-outlined">upload</span>
                    <span>Load New Scene</span>
                  </button>
                </div>
              </motion.div>

              {/* 3D Viewer */}
              <motion.div
                className="lg:col-span-3 relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className={`relative bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden ${
                  isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'
                }`}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
                  />
                  
                  {/* Viewer Overlay */}
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className="text-sm text-white">
                      {sceneStats?.triangles.toLocaleString()} triangles • {sceneStats?.renderTime.toFixed(1)}ms
                    </div>
                  </div>

                  {/* Fullscreen Exit */}
                  {isFullscreen && (
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined">fullscreen_exit</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && <LoadingOverlay />}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm z-50 max-w-md"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
          >
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-300 hover:text-red-200"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default TriangleSplattingPage;
