import * as THREE from 'three';

// Basic GLSL from Triangle Splatting Viewer (simplified)
const vertexShader = `
  varying vec3 vColor;
  varying vec3 vNormal;
  
  void main() {
    #ifdef USE_COLOR
    vColor = color;
    #else
      vColor = vec3(0.5, 0.5, 0.5);
    #endif
    
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying vec3 vNormal;
  uniform float exposure;
  
  void main() {
    // Basic lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    vec3 finalColor = vColor * (0.4 + 0.6 * diffuse) * exposure;
    
    // Simple tone mapping
    finalColor = finalColor / (finalColor + vec3(1.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
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
    depthWrite: true,
    side: THREE.DoubleSide,
  });
} 