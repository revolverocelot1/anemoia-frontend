import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Star Wars Radar Terminal Shader
const RadarTerminalMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uColorPrimary: new THREE.Color('#00d4ff'), // Cyan
    uColorSecondary: new THREE.Color('#0099ff'), // Blue
    uColorAccent: new THREE.Color('#ff00ff'), // Magenta accent
    uScanAngle: 0,
  },
  // Vertex shader
  `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Subtle wave based on mouse
      vec3 pos = position;
      float dist = distance(vUv, uMouse);
      float wave = sin(dist * 8.0 - uTime * 3.0) * 0.02;
      pos.z += wave * smoothstep(0.3, 0.0, dist);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec3 uColorPrimary;
    uniform vec3 uColorSecondary;
    uniform vec3 uColorAccent;
    uniform float uScanAngle;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    #define PI 3.14159265359
    
    float line(vec2 p, vec2 a, vec2 b, float width) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      vec2 closest = a + t * ba;
      float d = length(p - closest);
      return smoothstep(width, 0.0, d);
    }
    
    float circle(vec2 p, vec2 center, float radius, float width) {
      float d = abs(length(p - center) - radius);
      return smoothstep(width, 0.0, d);
    }
    
    void main() {
      vec2 center = vec2(0.5, 0.5);
      vec2 uv = vUv;
      vec2 toCenter = uv - center;
      float dist = length(toCenter);
      float angle = atan(toCenter.y, toCenter.x);
      
      // Radar circles
      float circles = 0.0;
      for(float i = 0.1; i <= 0.4; i += 0.1) {
        circles += circle(uv, center, i, 0.003) * 0.8;
      }
      
      // Grid lines
      float grid = 0.0;
      // Radial lines
      for(float i = 0.0; i < PI * 2.0; i += PI / 6.0) {
        vec2 dir = vec2(cos(i), sin(i));
        grid += line(uv, center, center + dir * 0.4, 0.001) * 0.3;
      }
      
      // Coordinate grid
      float gridSize = 20.0;
      vec2 gridUV = fract(uv * gridSize);
      float gridLines = step(0.98, gridUV.x) + step(0.98, gridUV.y);
      grid += gridLines * 0.1;
      
      // Radar sweep
      float sweep = 0.0;
      float sweepAngle = mod(uScanAngle, PI * 2.0);
      float angleDiff = mod(angle - sweepAngle + PI, PI * 2.0) - PI;
      sweep = exp(-angleDiff * angleDiff * 10.0) * (1.0 - smoothstep(0.0, 0.4, dist));
      
      // Radar trail
      float trail = 0.0;
      for(float i = 0.0; i < 0.5; i += 0.1) {
        float trailAngle = sweepAngle - i;
        float trailDiff = mod(angle - trailAngle + PI, PI * 2.0) - PI;
        trail += exp(-trailDiff * trailDiff * 20.0) * (1.0 - i * 2.0) * 0.3;
      }
      trail *= (1.0 - smoothstep(0.0, 0.4, dist));
      
      // Mouse interaction
      float mouseInfluence = 1.0 - smoothstep(0.0, 0.2, distance(uv, uMouse));
      
      // Data points (simulated targets)
      float targets = 0.0;
      vec2 target1 = vec2(0.3, 0.6) + vec2(sin(uTime * 2.1), cos(uTime * 1.7)) * 0.05;
      vec2 target2 = vec2(0.7, 0.3) + vec2(cos(uTime * 1.5), sin(uTime * 2.3)) * 0.03;
      vec2 target3 = vec2(0.6, 0.7) + vec2(sin(uTime * 3.1), cos(uTime * 2.1)) * 0.04;
      
      targets += circle(uv, target1, 0.01, 0.003) * (0.5 + sin(uTime * 4.0) * 0.5);
      targets += circle(uv, target2, 0.01, 0.003) * (0.5 + sin(uTime * 3.0 + 1.0) * 0.5);
      targets += circle(uv, target3, 0.01, 0.003) * (0.5 + sin(uTime * 5.0 + 2.0) * 0.5);
      
      // Terminal text effect (simulated)
      float text = 0.0;
      if(uv.x > 0.02 && uv.x < 0.3 && uv.y > 0.02 && uv.y < 0.15) {
        float textLine = floor(uv.y * 100.0);
        text = step(0.5, fract(sin(textLine * 43.3458 + uTime) * 43758.5453)) * 0.3;
        text *= step(fract(uv.x * 50.0), 0.8);
      }
      
      // Combine all effects
      vec3 color = uColorPrimary;
      float alpha = circles + grid + text;
      
      // Add sweep and trail with color
      color = mix(color, uColorSecondary, sweep + trail);
      alpha += sweep * 2.0 + trail;
      
      // Add targets with accent color
      color = mix(color, uColorAccent, targets);
      alpha += targets * 3.0;
      
      // Mouse highlight
      color = mix(color, uColorSecondary, mouseInfluence * 0.3);
      alpha += mouseInfluence * 0.5;
      
      // Vignette effect
      float vignette = 1.0 - smoothstep(0.3, 0.5, dist);
      alpha *= vignette;
      
      // Output
      gl_FragColor = vec4(color, alpha * 1.5);
    }
  `
);

// Data particles shader
const DataParticleMaterial = shaderMaterial(
  {
    uTime: 0,
    uSize: 3.0,
  },
  // Vertex shader
  `
    uniform float uTime;
    uniform float uSize;
    attribute float aSpeed;
    attribute float aOffset;
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      
      // Vertical movement
      pos.y = mod(pos.y - uTime * aSpeed + aOffset, 10.0) - 5.0;
      
      // Pulse size
      float pulse = sin(uTime * 2.0 + aOffset * 6.28) * 0.5 + 0.5;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = uSize * (1.0 + pulse) * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      
      vAlpha = 1.0 - smoothstep(-5.0, 5.0, abs(pos.y));
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    varying float vAlpha;
    
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha *= vAlpha;
      
      vec3 color = vec3(0.0, 0.8, 1.0);
      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ RadarTerminalMaterial, DataParticleMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      radarTerminalMaterial: any;
      dataParticleMaterial: any;
    }
  }
}

const StarWarsTerminal = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.Points>(null!);
  const { viewport, mouse } = useThree();
  const [scanAngle, setScanAngle] = useState(0);
  
  // Generate particle positions for holographic effect
  const particles = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Particles in a circular area
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * viewport.width * 0.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      speeds[i] = Math.random() * 0.5 + 0.2;
      offsets[i] = Math.random();
    }
    
    return { positions, speeds, offsets };
  }, [viewport.width]);
  
  useFrame((_state, delta) => {
    // Update radar sweep angle
    setScanAngle(prev => prev + delta * 0.5);
    
    if (meshRef.current) {
      const material = meshRef.current.material as any;
      material.uniforms.uTime.value += delta;
      material.uniforms.uMouse.value.x = (mouse.x + 1) / 2;
      material.uniforms.uMouse.value.y = (mouse.y + 1) / 2;
      material.uniforms.uScanAngle.value = scanAngle;
    }
    
    if (particlesRef.current) {
      const material = particlesRef.current.material as any;
      material.uniforms.uTime.value += delta;
    }
  });
  
  return (
    <>
      {/* Main radar display */}
      <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -2, 0]}>
        <planeGeometry args={[viewport.width * 2, viewport.height * 2, 128, 128]} />
        <radarTerminalMaterial transparent depthWrite={false} />
      </mesh>
      
      {/* Data particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-aSpeed"
            args={[particles.speeds, 1]}
          />
          <bufferAttribute
            attach="attributes-aOffset"
            args={[particles.offsets, 1]}
          />
        </bufferGeometry>
        <dataParticleMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#00d4ff" />
    </>
  );
};

export default StarWarsTerminal; 