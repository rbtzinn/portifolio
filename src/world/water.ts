import * as THREE from 'three'
import { TIER } from '../tier'
import { FOG_COLOR, MOON_DIR, SKY_GLSL } from './sky'
import { LAMP_XS, LAMP_Z, LANTERN, QUAY_EDGE_Z, QUAY_X, LIGHTHOUSE } from './layout'

const SIZE = 900

export const waterUniforms = {
  uTime: { value: 0 },
  uMoonDir: { value: MOON_DIR },
  uFog: { value: FOG_COLOR },
  uFogDensity: { value: 0.0062 },
  uLamps: { value: LAMP_XS.map((x) => new THREE.Vector2(x, LAMP_Z)) },
  uLantern: { value: new THREE.Vector2(LANTERN.x, LANTERN.z) },
  uBeam: { value: 0 },
  uFocus: { value: new THREE.Vector3(0, -100, 0) },
  uFocusColor: { value: new THREE.Color('#ff8a3d') }
}

export function createWater() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, TIER.waterSegments, TIER.waterSegments)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      float h(vec2 p) {
        float t = uTime;
        float y = 0.0;
        y += sin(dot(p, vec2(0.08, 0.03)) + t * 0.9) * 0.32;
        y += sin(dot(p, vec2(-0.05, 0.11)) + t * 1.2) * 0.22;
        y += sin(dot(p, vec2(0.17, -0.09)) + t * 1.7) * 0.09;
        y += sin(dot(p, vec2(-0.21, -0.19)) + t * 2.1) * 0.05;
        return y;
      }
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float e = 0.6;
        float y = h(w.xz);
        float dx = h(w.xz + vec2(e, 0.0)) - y;
        float dz = h(w.xz + vec2(0.0, e)) - y;
        vNormal2 = normalize(vec3(-dx / e, 1.0, -dz / e));
        w.y += y;
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMoonDir;
      uniform vec3 uFog;
      uniform float uFogDensity;
      uniform vec2 uLamps[${LAMP_XS.length}];
      uniform vec2 uLantern;
      uniform float uBeam;
      uniform vec3 uFocus;
      uniform vec3 uFocusColor;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      ${SKY_GLSL}

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }

      float streak(vec2 base, vec2 p, vec2 cam, float width, float reach) {
        vec2 d = normalize(cam - base);
        vec2 q = p - base;
        float along = dot(q, d);
        if (along < 0.0) return 0.0;
        float perp = q.x * d.y - q.y * d.x;
        float w = width + along * 0.018;
        return exp(-perp * perp / (w * w)) * exp(-along / reach);
      }

      void main() {
        vec3 wp = vWorld;
        vec2 np = wp.xz * 0.45;
        float t = uTime;
        // micro-ondulação procedural
        float n1 = noise(np + vec2(t * 0.6, t * 0.3));
        float n2 = noise(np * 2.3 - vec2(t * 0.4, -t * 0.7));
        vec3 n = normalize(vNormal2 + vec3((n1 - 0.5) * 0.22 + (n2 - 0.5) * 0.12, 0.0, (n2 - 0.5) * 0.22 - (n1 - 0.5) * 0.1));

        vec3 V = normalize(cameraPosition - wp);
        vec3 R = reflect(-V, n);
        R.y = abs(R.y);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);

        vec3 deep = vec3(0.004, 0.012, 0.026);
        vec3 col = mix(deep, skyColor(R, uMoonDir), fres);

        // caminho da lua
        float glint = pow(max(dot(R, uMoonDir), 0.0), 380.0) * 4.0 + pow(max(dot(R, uMoonDir), 0.0), 60.0) * 0.25;
        col += vec3(0.8, 0.85, 1.0) * glint;

        // reflexos das luminárias de sódio (listras em direção à câmera)
        vec2 p = wp.xz + n.xz * 5.0;
        vec2 cam = cameraPosition.xz;
        float flick = 0.45 + 0.9 * noise(wp.xz * vec2(1.6, 0.35) + vec2(0.0, t * 1.4));
        float s = 0.0;
        for (int i = 0; i < ${LAMP_XS.length}; i++) s += streak(uLamps[i] + vec2(0.0, 1.4), p, cam, 0.6, 26.0);
        col += vec3(1.0, 0.46, 0.14) * s * flick * 0.9;

        // farol
        float ls = streak(uLantern + vec2(0.0, 3.0), p, cam, 1.2, 70.0);
        col += vec3(1.0, 0.82, 0.55) * ls * flick * (0.35 + uBeam * 1.6);

        // brilho do contêiner em foco
        float fd = length(wp.xz - uFocus.xz);
        col += uFocusColor * exp(-fd * 0.22) * 0.25 * flick * step(-50.0, uFocus.y);

        // espuma junto ao cais e ao quebra-mar
        float foam = 0.0;
        if (wp.x > ${QUAY_X[0].toFixed(1)} && wp.x < ${QUAY_X[1].toFixed(1)}) foam = smoothstep(2.2, 0.0, wp.z - ${QUAY_EDGE_Z.toFixed(1)});
        if (wp.x > ${QUAY_X[1].toFixed(1)} && wp.x < ${(LIGHTHOUSE.x + 6).toFixed(1)}) foam = max(foam, smoothstep(3.0, 0.0, abs(wp.z - ${(LIGHTHOUSE.z).toFixed(1)}) - 4.5));
        foam *= smoothstep(0.55, 0.8, noise(wp.xz * 1.3 + vec2(t * 0.5, -t * 0.8)));
        col += vec3(0.35, 0.4, 0.45) * foam * 0.5;

        float dist = length(cameraPosition - wp);
        float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  const cell = SIZE / TIER.waterSegments
  return {
    mesh,
    follow(camera: THREE.Camera) {
      mesh.position.x = Math.round(camera.position.x / cell) * cell
      mesh.position.z = Math.round(camera.position.z / cell) * cell
    }
  }
}
