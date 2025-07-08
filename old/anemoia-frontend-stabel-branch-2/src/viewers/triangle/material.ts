import * as THREE from 'three';

// Basic GLSL from Triangle Splatting Viewer (simplified)
const vertexShader = `
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  uniform float exposure;
  void main() {
    gl_FragColor = vec4(vColor * exposure, 1.0);
  }
`;

export function createTriangleMaterial(initialExposure = 1.0): THREE.ShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {
    exposure: { value: initialExposure },
  };
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    vertexColors: true,
    depthTest: true,
  });
} 