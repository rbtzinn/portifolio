import * as THREE from 'three'

export type Palette = [string, string]

/**
 * Um único THREE.Points com N partículas. Toda a animação roda no vertex shader:
 * morph entre duas formas (aFrom → aTo) com atraso por partícula e redemoinho
 * durante a transição, repulsão do mouse e onda de choque no clique.
 */
export function createParticles(n: number, shapes: Float32Array[], palettes: Palette[]) {
  const geo = new THREE.BufferGeometry()
  const attrs = shapes.map((s) => new THREE.BufferAttribute(s, 3))
  const rnd = new Float32Array(n * 4)
  for (let i = 0; i < n * 4; i++) rnd[i] = Math.random()
  geo.setAttribute('position', attrs[0])
  geo.setAttribute('aFrom', attrs[0])
  geo.setAttribute('aTo', attrs[1])
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6)

  const col = (h: string) => new THREE.Color(h)
  const uniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 99) },
    uMouseK: { value: 0 },
    uPulse: { value: new THREE.Vector4(0, 0, 0, -1) },
    uFrom1: { value: col(palettes[0][0]) },
    uFrom2: { value: col(palettes[0][1]) },
    uTo1: { value: col(palettes[1][0]) },
    uTo2: { value: col(palettes[1][1]) },
    uSize: { value: 0.028 },
    uScale: { value: 500 },
    uBright: { value: 1 }
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uMorph, uTime, uMouseK, uSize, uScale, uBright;
      uniform vec3 uMouse, uFrom1, uFrom2, uTo1, uTo2;
      uniform vec4 uPulse;
      attribute vec3 aFrom, aTo;
      attribute vec4 aRnd;
      varying vec3 vCol;
      varying float vA;

      vec3 swirl(vec3 p, float t) {
        return vec3(
          sin(p.y * 1.7 + t * 0.9 + aRnd.y * 6.28),
          sin(p.z * 1.4 + t * 1.1 + aRnd.z * 6.28),
          sin(p.x * 1.6 + t * 0.8 + aRnd.w * 6.28)
        );
      }

      void main() {
        // cada partícula parte com um pequeno atraso: a forma "escorre" para a próxima
        float d = aRnd.x * 0.45;
        float e = clamp((uMorph - d) / 0.55, 0.0, 1.0);
        e = e * e * (3.0 - 2.0 * e);
        vec3 p = mix(aFrom, aTo, e);
        float mid = sin(e * 3.14159);
        p += swirl(p * 0.8, uTime) * mid * (0.9 + aRnd.w * 0.8);
        // respiração
        p += vec3(sin(uTime * 0.7 + aRnd.y * 40.0), cos(uTime * 0.6 + aRnd.z * 40.0), sin(uTime * 0.8 + aRnd.w * 40.0)) * 0.014;

        // repulsão do mouse
        vec3 dm = p - uMouse;
        float dl = length(dm);
        float push = smoothstep(1.1, 0.0, dl) * uMouseK;
        p += normalize(dm + 1e-5) * push * 0.6;

        // onda de choque do clique
        float glow = push * 0.8;
        if (uPulse.w >= 0.0) {
          float r = uPulse.w * 5.5;
          float band = exp(-pow((length(p - uPulse.xyz) - r) * 2.2, 2.0)) * exp(-uPulse.w * 1.4);
          p += normalize(p - uPulse.xyz + 1e-5) * band * 0.7;
          glow += band * 1.5;
        }

        vec3 cFrom = mix(uFrom1, uFrom2, smoothstep(-2.0, 2.0, aFrom.y + (aRnd.y - 0.5) * 1.5));
        vec3 cTo = mix(uTo1, uTo2, smoothstep(-2.0, 2.0, aTo.y + (aRnd.y - 0.5) * 1.5));
        vCol = mix(cFrom, cTo, e) * (1.0 + glow) * uBright;
        // alguns pontos cintilam
        vA = 0.55 + 0.45 * step(0.93, aRnd.z) * (0.5 + 0.5 * sin(uTime * 3.0 + aRnd.x * 50.0));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.55 + aRnd.z * 1.1) * (1.0 + mid * 0.6 + glow) * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol * a, a);
        #include <colorspace_fragment>
      }
    `
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false

  let seg = -1
  return {
    points,
    uniforms,
    /** f = posição contínua ao longo das formas (0..shapes-1) */
    setProgress(f: number, hold = 0.14) {
      const i = Math.min(Math.floor(f), shapes.length - 2)
      if (i !== seg) {
        seg = i
        geo.setAttribute('aFrom', attrs[i])
        geo.setAttribute('aTo', attrs[i + 1])
        uniforms.uFrom1.value.set(palettes[i][0])
        uniforms.uFrom2.value.set(palettes[i][1])
        uniforms.uTo1.value.set(palettes[i + 1][0])
        uniforms.uTo2.value.set(palettes[i + 1][1])
      }
      // segura a forma pronta perto de cada parada
      const t = f - i
      uniforms.uMorph.value = Math.min(1, Math.max(0, (t - hold) / (1 - hold * 2)))
    }
  }
}

/** Poeira de fundo, bem sutil, para dar profundidade. */
export function createDust(n: number) {
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 8 + Math.random() * 30
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th) - 10], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const uniforms = { uTime: { value: 0 }, uScale: { value: 500 } }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScale;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.1 + position.x) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = 0.25 + 0.2 * sin(uTime * 0.8 + position.z * 3.0);
        gl_PointSize = 0.05 * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
        gl_FragColor = vec4(vec3(0.6, 0.7, 1.0) * a, a);
        #include <colorspace_fragment>
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return { points: pts, uniforms }
}
