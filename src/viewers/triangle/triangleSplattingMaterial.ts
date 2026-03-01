import * as THREE from 'three';

export interface TriangleSplattingMaterialOptions {
  hasVertexColors?: boolean;
  wireframe?: boolean;
  exposure?: number;
  backgroundColor?: THREE.Color;
  backgroundBlend?: number;
  ambientIntensity?: number;
  sunIntensity?: number;
  shadowSoftness?: number;
  colorGrading?: {
    contrast: number;
    saturation: number;
    brightness: number;
  };
  enableFresnel?: boolean;
  fresnelPower?: number;
  enableRimLight?: boolean;
  rimLightColor?: THREE.Color;
  rimLightIntensity?: number;
}

export function createTriangleSplattingMaterial(
  options: TriangleSplattingMaterialOptions = {}
): THREE.ShaderMaterial {
  const {
    hasVertexColors = true,
    wireframe = false,
    exposure = 1.0,
    backgroundColor = new THREE.Color(0x001428),
    backgroundBlend = 0.0,
    ambientIntensity = 0.6,
    sunIntensity = 1.0,
    shadowSoftness = 0.5,
    colorGrading = { contrast: 1.0, saturation: 1.1, brightness: 1.0 },
    enableFresnel = true,
    fresnelPower = 2.0,
    enableRimLight = true,
    rimLightColor = new THREE.Color(0x00d4ff),
    rimLightIntensity = 0.3
  } = options;

  const vertexShader = `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vDepth;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vDepth = -mvPosition.z;
      
      #ifdef USE_COLOR
        vColor = color;
      #else
        // Generate natural garden colors based on position
        float height = position.y;
        float variation = sin(position.x * 0.1) * cos(position.z * 0.1) * 0.3;
        
        if (height < 0.1) {
          // Ground - rich earth tones
          vColor = mix(
            vec3(0.35, 0.25, 0.15), // Dark soil
            vec3(0.45, 0.35, 0.25), // Light soil
            variation + 0.5
          );
        } else if (height < 0.5) {
          // Low vegetation - vibrant greens
          vColor = mix(
            vec3(0.2, 0.5, 0.15), // Deep green
            vec3(0.35, 0.65, 0.25), // Fresh green
            variation + 0.5
          );
        } else {
          // Trees and foliage - varied greens with highlights
          vColor = mix(
            vec3(0.15, 0.4, 0.1), // Dark foliage
            vec3(0.3, 0.6, 0.2), // Light foliage
            variation + 0.5
          );
          
          // Add some colorful accents for flowers
          float flowerChance = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
          if (flowerChance > 0.95) {
            float hue = fract(flowerChance * 10.0);
            vColor = mix(vColor, vec3(0.9, 0.3 + hue * 0.4, 0.4), 0.7);
          }
        }
      #endif
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform float exposure;
    uniform vec3 ambientLight;
    uniform vec3 directionalLightColor;
    uniform vec3 directionalLightDirection;
    uniform vec3 secondaryLightColor;
    uniform vec3 secondaryLightDirection;
    uniform float opacity;
    uniform float fogNear;
    uniform float fogFar;
    uniform vec3 fogColor;
    uniform vec3 backgroundColor;
    uniform float backgroundBlend;
    uniform float ambientIntensity;
    uniform float sunIntensity;
    uniform float shadowSoftness;
    uniform vec3 colorGradingParams; // contrast, saturation, brightness
    uniform float fresnelPower;
    uniform vec3 rimLightColor;
    uniform float rimLightIntensity;
    uniform float time;
    
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vDepth;
    
    // Improved tone mapping
    vec3 ACESFilmicToneMapping(vec3 color) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
    }
    
    // Color grading
    vec3 colorGrade(vec3 color) {
      // Contrast
      color = mix(vec3(0.5), color, colorGradingParams.x);
      
      // Saturation
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(gray), color, colorGradingParams.y);
      
      // Brightness
      color *= colorGradingParams.z;
      
      return color;
    }
    
    // Soft shadows approximation
    float softShadow(vec3 normal, vec3 lightDir) {
      float NdotL = dot(normal, lightDir);
      return smoothstep(-shadowSoftness, shadowSoftness, NdotL);
    }
    
    // Fresnel effect
    float fresnel(vec3 viewDirection, vec3 normal, float power) {
      return pow(1.0 - abs(dot(viewDirection, normal)), power);
    }
    
    // Subsurface scattering approximation for leaves
    vec3 subsurfaceScattering(vec3 color, vec3 lightDir, vec3 viewDir, vec3 normal) {
      float backlight = max(0.0, dot(viewDir, -lightDir));
      vec3 subsurface = color * vec3(0.8, 1.0, 0.6) * pow(backlight, 2.0);
      return subsurface * 0.3;
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 worldNormal = normalize(vWorldNormal);
      
      // Main directional light (sun) with soft shadows
      vec3 sunDir = normalize(directionalLightDirection);
      float sunShadow = softShadow(normal, sunDir);
      float NdotL = max(dot(normal, sunDir), 0.0);
      vec3 diffuse = directionalLightColor * NdotL * sunShadow * sunIntensity;
      
      // Add subsurface scattering for vegetation
      vec3 subsurface = vec3(0.0);
      if (vColor.g > vColor.r * 1.2 && vColor.g > vColor.b * 1.2) {
        subsurface = subsurfaceScattering(vColor, sunDir, viewDir, normal);
      }
      
      // Secondary light (sky/bounce light)
      float NdotL2 = max(dot(normal, normalize(secondaryLightDirection)), 0.0);
      vec3 diffuse2 = secondaryLightColor * NdotL2 * 0.5;
      
      // Ambient light with hemisphere lighting
      vec3 skyColor = mix(vec3(0.4, 0.5, 0.7), vec3(0.7, 0.8, 1.0), worldNormal.y * 0.5 + 0.5);
      vec3 groundColor = vec3(0.2, 0.18, 0.15);
      float hemiMix = worldNormal.y * 0.5 + 0.5;
      vec3 ambient = mix(groundColor, skyColor, hemiMix) * ambientLight * ambientIntensity;
      
      // Combine lighting
      vec3 lighting = ambient + diffuse + diffuse2 + subsurface;
      
      // Apply vertex color with color grading
      vec3 color = colorGrade(vColor) * lighting;
      
      // Fresnel effect
      float fresnelTerm = fresnel(viewDir, normal, fresnelPower);
      color += skyColor * fresnelTerm * 0.2;
      
      // Rim lighting
      float rim = 1.0 - max(0.0, dot(viewDir, normal));
      rim = pow(rim, 2.0);
      color += rimLightColor * rim * rimLightIntensity;
      
      // Specular highlights for wet surfaces
      vec3 halfVector = normalize(sunDir + viewDir);
      float specular = pow(max(dot(normal, halfVector), 0.0), 32.0);
      color += directionalLightColor * specular * 0.3;
      
      // Apply exposure
      color *= exposure;
      
      // Background blending for atmosphere
      if (backgroundBlend > 0.0) {
        float blend = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0) * backgroundBlend;
        color = mix(color, backgroundColor, blend);
      }
      
      // Tone mapping
      color = ACESFilmicToneMapping(color);
      
      // Fog effect for depth
      float fogFactor = smoothstep(fogNear, fogFar, vDepth);
      color = mix(color, fogColor, fogFactor);
      
      // Gamma correction
      color = pow(color, vec3(1.0 / 2.2));
      
      gl_FragColor = vec4(color, opacity);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      exposure: { value: exposure },
      ambientLight: { value: new THREE.Color(0.6, 0.65, 0.75) },
      directionalLightColor: { value: new THREE.Color(1.0, 0.98, 0.9) },
      directionalLightDirection: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
      secondaryLightColor: { value: new THREE.Color(0.4, 0.5, 0.7) },
      secondaryLightDirection: { value: new THREE.Vector3(-0.5, 0.3, -0.7).normalize() },
      opacity: { value: 1.0 },
      fogNear: { value: 10.0 },
      fogFar: { value: 200.0 },
      fogColor: { value: backgroundColor.clone().lerp(new THREE.Color(0x87CEEB), 0.3) },
      backgroundColor: { value: backgroundColor },
      backgroundBlend: { value: backgroundBlend },
      ambientIntensity: { value: ambientIntensity },
      sunIntensity: { value: sunIntensity },
      shadowSoftness: { value: shadowSoftness },
      colorGradingParams: { value: new THREE.Vector3(colorGrading.contrast, colorGrading.saturation, colorGrading.brightness) },
      fresnelPower: { value: fresnelPower },
      rimLightColor: { value: rimLightColor },
      rimLightIntensity: { value: rimLightIntensity },
      time: { value: 0.0 }
    },
    vertexColors: hasVertexColors,
    wireframe: wireframe,
    side: THREE.DoubleSide,
    transparent: false
  });
}

export function createOptimizedTriangleSplattingMaterial(
  options: TriangleSplattingMaterialOptions = {}
): THREE.ShaderMaterial {
  const {
    hasVertexColors = true,
    wireframe = false,
    exposure = 1.0,
  } = options;

  // Simplified vertex shader for performance
  const vertexShader = `
    #ifdef USE_COLOR
      varying vec3 vColor;
    #endif
    varying vec3 vNormal;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      
      #ifdef USE_COLOR
        vColor = color;
      #else
        vColor = vec3(0.5, 0.5, 0.5);
      #endif
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Optimized fragment shader with basic lighting
  const fragmentShader = `
    #ifdef USE_COLOR
      varying vec3 vColor;
    #endif
    varying vec3 vNormal;
    
    uniform float exposure;
    uniform vec3 lightDirection;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    void main() {
      vec3 normal = normalize(vNormal);
      
      // Simple directional light
      float NdotL = max(dot(normal, lightDirection), 0.0);
      vec3 diffuse = lightColor * NdotL;
      
      // Basic ambient
      vec3 ambient = ambientColor;
      
      // Combine lighting
      vec3 lighting = ambient + diffuse;
      
      // Apply vertex color
      #ifdef USE_COLOR
        vec3 color = vColor * lighting * exposure;
      #else
        vec3 color = vec3(0.5) * lighting * exposure;
      #endif
      
      // Simple tone mapping
      color = color / (color + vec3(1.0));
      
      // Gamma correction
      color = pow(color, vec3(1.0 / 2.2));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      exposure: { value: exposure },
      lightDirection: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
      lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
      ambientColor: { value: new THREE.Color(0.3, 0.3, 0.3) },
    },
    vertexColors: hasVertexColors,
    wireframe: wireframe,
    side: THREE.DoubleSide,
    defines: hasVertexColors ? { USE_COLOR: true } : {}
  });
}

export function createTriangleSplattingDepthMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
      }
    `,
    side: THREE.DoubleSide
  });
}

export function createLODMaterial(level: number): THREE.MeshBasicMaterial {
  // Create simplified materials for different LOD levels
  const colors = [
    0x4a7c4e, // LOD 0 - green
    0x5a8c5e, // LOD 1 - lighter green
    0x6a9c6e, // LOD 2 - even lighter
    0x7aac7e  // LOD 3 - lightest
  ];
  
  return new THREE.MeshBasicMaterial({
    color: colors[level] || colors[3],
    vertexColors: true,
    side: THREE.DoubleSide
  });
} 