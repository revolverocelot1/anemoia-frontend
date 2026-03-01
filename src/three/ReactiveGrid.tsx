import { shaderMaterial } from '@react-three/drei';
import { extend, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

// GLSL shaders
const vertex = `
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 pos = position;
  float freq = 3.0;
  float amp = 0.6;
  pos.z += sin((pos.x+uTime)*freq)*amp;
  pos.z += cos((pos.y+uTime)*freq)*amp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const fragment = `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float gridThickness = 0.15;
  float lineX = step(1.0 - gridThickness, fract(vUv.x*10.0)) + step(fract(vUv.x*10.0), gridThickness);
  float lineY = step(1.0 - gridThickness, fract(vUv.y*10.0)) + step(fract(vUv.y*10.0), gridThickness);
  float alpha = max(lineX, lineY) * 0.8;
  gl_FragColor = vec4(uColor, alpha);
}`;

const GridMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#00b0ff') },
  vertex,
  fragment
);

extend({ GridMaterial });

// GridMaterial is already declared by @react-three/drei

const ReactiveGrid = () => {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((_state, delta) => {
    if (mesh.current) {
      // @ts-ignore
      mesh.current.material.uniforms.uTime.value += delta;
    }
  });

  const { viewport } = useThree();
  return (
    <mesh rotation-x={-Math.PI / 2} ref={mesh} position={[0, -0.2, 0]}>
      <planeGeometry args={[viewport.width * 4, viewport.height * 4, 120, 120]} />
      {/* @ts-ignore */}
      <gridMaterial transparent />
    </mesh>
  );
};

export default ReactiveGrid; 