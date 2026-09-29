import * as THREE from 'three'
import { TIER } from '../tier'

export const MOON_DIR = new THREE.Vector3(-0.32, 0.2, -1).normalize()
export const FOG_COLOR = new THREE.Color('#0b1020')

export const skyUniforms = {
  uTime: { value: 0 },
  uMoonDir: { value: MOON_DIR },
  uFlash: { value: 0 }
}

// GLSL compartilhado: a mesma função de céu é usada no reflexo da água
export const SKY_GLSL = /* glsl */ `
  vec3 skyColor(vec3 d, vec3 moonDir) {
    float y = d.y;
    vec3 zenith = vec3(0.012, 0.018, 0.045);
    vec3 mid = vec3(0.035, 0.05, 0.11);
    vec3 horizon = vec3(0.16, 0.11, 0.16);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, y));
    col = mix(col, zenith, smoothstep(0.18, 0.75, y));
    // brilho da cidade/porto no horizonte (direção -z)
    float city = pow(max(0.0, -d.z), 3.0) * exp(-max(y, 0.0) * 14.0);
    col += vec3(0.55, 0.24, 0.08) * city * 0.55;
    // halo da lua
    float m = max(dot(d, moonDir), 0.0);
    col += vec3(0.5, 0.6, 0.8) * pow(m, 60.0) * 0.35 + vec3(0.25, 0.3, 0.45) * pow(m, 6.0) * 0.08;
    return col;
  }
`

export function createSky() {
  const group = new THREE.Group()

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoonDir;
      uniform float uFlash;
      varying vec3 vDir;
      ${SKY_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = skyColor(d, uMoonDir);
        // disco da lua
        float m = dot(d, uMoonDir);
        col += vec3(1.0, 0.97, 0.9) * smoothstep(0.99935, 0.99965, m) * 1.8;
        col += vec3(1.0, 0.8, 0.55) * uFlash * 0.25;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat)
  sky.renderOrder = -10
  group.add(sky)

  // estrelas
  const n = TIER.stars
  const pos = new Float32Array(n * 3)
  const size = new Float32Array(n)
  const phase = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const u = Math.random()
    const v = Math.random() * 0.9 + 0.08
    const th = u * Math.PI * 2
    const y = v
    const r = Math.sqrt(1 - y * y)
    pos.set([Math.cos(th) * r * 850, y * 850, Math.sin(th) * r * 850], i * 3)
    size[i] = Math.random() < 0.05 ? 3.2 : 1 + Math.random() * 1.4
    phase[i] = Math.random() * 100
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: skyUniforms.uTime, uPixel: { value: Math.min(devicePixelRatio, TIER.maxDpr) } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPixel;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPhase) * 2.0) + aPhase);
        vA *= smoothstep(0.0, 120.0, position.y);
        gl_PointSize = aSize * uPixel;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
        #include <colorspace_fragment>
      }
    `
  })
  const stars = new THREE.Points(g, starMat)
  stars.frustumCulled = false
  group.add(stars)
  return group
}
