import * as THREE from 'three'
import { TIER } from '../tier'
import meta from './portrait-meta.json'

/**
 * Retrato 3D real do Roberto: a própria foto, recortada por IA (MediaPipe) e
 * deslocada por um mapa de profundidade (silhueta inflada + 478 pontos 3D do rosto).
 * Iluminado pela cena, com parallax no mouse, varredura RFID no clique e
 * dissolução em partículas quando o visitante rola a página.
 */

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { return noise(p) * 0.6 + noise(p * 2.3) * 0.3 + noise(p * 5.1) * 0.1; }
`

export function createPortrait(width = 3.6) {
  const H = width * meta.aspect
  const depthScale = width * meta.depth * 0.85
  const group = new THREE.Group()
  const loader = new THREE.TextureLoader()
  const color = loader.load('/assets/roberto-cutout.webp')
  color.colorSpace = THREE.SRGBColorSpace
  color.anisotropy = 8
  const depth = loader.load('/assets/roberto-depth.png')
  depth.colorSpace = THREE.NoColorSpace

  const uniforms = {
    uColor: { value: color },
    uDepth: { value: depth },
    uDepthScale: { value: depthScale },
    uSize: { value: new THREE.Vector2(width, H) },
    uTexel: { value: new THREE.Vector2(1 / 540, 1 / 535) },
    uTime: { value: 0 },
    uDissolve: { value: 0 },
    uScan: { value: -1 },
    uHover: { value: 0 },
    uRot: { value: new THREE.Matrix3() },
    uKey: { value: new THREE.Vector3(-0.6, 0.35, 0.72).normalize() },
    uRim: { value: new THREE.Vector3(0.75, 0.25, -0.6).normalize() },
    uScale: { value: 400 }
  }

  const seg = TIER.low ? 150 : 260
  const geo = new THREE.PlaneGeometry(width, H, seg, seg)
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    vertexShader: /* glsl */ `
      uniform sampler2D uDepth; uniform float uDepthScale;
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += texture2D(uDepth, uv).r * uDepthScale;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uColor; uniform sampler2D uDepth;
      uniform float uDepthScale; uniform vec2 uSize; uniform vec2 uTexel;
      uniform float uTime; uniform float uDissolve; uniform float uScan; uniform float uHover;
      uniform mat3 uRot; uniform vec3 uKey; uniform vec3 uRim;
      varying vec2 vUv; varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec4 c = texture2D(uColor, vUv);
        if (c.a < 0.5) discard;

        // base se desfaz em "dados" (fica flutuando sobre o píer)
        float n = fbm(vUv * 9.0 + vec2(0.0, -uTime * 0.25));
        float fade = vUv.y - 0.2 + (n - 0.5) * 0.16;
        if (fade < 0.0) discard;
        // dissolução ao rolar
        float nd = fbm(vUv * 10.0);
        float th = uDissolve * 1.25 - 0.1;
        if (nd < th) discard;

        // normal a partir do mapa de profundidade
        float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
        float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
        vec3 nl = normalize(vec3(-dx * uDepthScale / (2.0 * uTexel.x * uSize.x), -dy * uDepthScale / (2.0 * uTexel.y * uSize.y), 1.0));
        vec3 N = normalize(uRot * nl);
        vec3 V = normalize(cameraPosition - vWorld);

        vec3 albedo = c.rgb;
        // reilumina com a luz da cena: sódio quente de um lado, lua fria recortando do outro
        float key = max(dot(N, uKey), 0.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        float rimL = fres * (0.4 + 0.6 * max(dot(N, uRim), 0.0));
        vec3 lit = albedo * (0.62 + 0.55 * key * vec3(1.08, 0.94, 0.82));
        lit += vec3(0.45, 0.6, 1.0) * rimL * (0.55 + uHover * 0.6);
        lit += vec3(1.0, 0.5, 0.18) * pow(max(dot(N, uKey), 0.0), 8.0) * 0.08;

        // bordas brilhantes da dissolução e da base
        float edge = smoothstep(0.014, 0.0, fade) + smoothstep(th + 0.03, th, nd) * step(0.001, uDissolve);
        lit = mix(lit, vec3(1.0, 0.42, 0.12) * 1.6, clamp(edge, 0.0, 1.0) * 0.6);

        // varredura RFID do clique
        if (uScan > -0.5) {
          float line = exp(-pow((vUv.y - uScan) * 70.0, 2.0));
          float trail = smoothstep(0.0, 0.25, vUv.y - uScan) * smoothstep(0.35, 0.0, vUv.y - uScan);
          lit += vec3(1.0, 0.55, 0.2) * line * 2.5 + vec3(1.0, 0.6, 0.3) * trail * 0.12;
        }

        gl_FragColor = vec4(lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  group.add(mesh)

  // ——— partículas: sobem da base e carregam o corpo quando ele se dissolve
  const count = TIER.low ? 1800 : 4200
  const uvs = new Float32Array(count * 2)
  const rnd = new Float32Array(count * 3)
  const pointGeo = new THREE.BufferGeometry()
  pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  pointGeo.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2))
  pointGeo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3))
  const pointMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform sampler2D uDepth; uniform sampler2D uColor;
      uniform float uDepthScale; uniform vec2 uSize; uniform float uTime; uniform float uDissolve; uniform float uScale;
      attribute vec2 aUv; attribute vec3 aRnd;
      varying vec3 vCol; varying float vA;
      ${NOISE}
      void main() {
        vec3 p = vec3((aUv.x - 0.5) * uSize.x, (aUv.y - 0.5) * uSize.y, texture2D(uDepth, aUv).r * uDepthScale);
        vCol = texture2D(uColor, aUv).rgb;
        // brasas na base
        float base = smoothstep(0.27, 0.16, aUv.y);
        float ph = fract(uTime * (0.08 + aRnd.x * 0.1) + aRnd.y);
        vec3 drift = vec3(sin(uTime * 0.7 + aRnd.z * 6.0) * 0.12, ph * 1.4, (aRnd.x - 0.5) * 0.3);
        float aBase = base * sin(ph * 3.14159) * 0.9;
        // dissolução
        float nd = fbm(aUv * 10.0);
        float th = uDissolve * 1.25 - 0.1;
        float k = clamp((th - nd) * 3.0, 0.0, 1.0);
        vec3 fly = (aRnd - 0.5) * vec3(3.0, 1.6, 3.0) * k + vec3(0.0, k * 2.2, k * 1.2);
        vA = max(aBase, k * (1.0 - k) * 3.5 * step(0.001, uDissolve));
        p += drift * base * (1.0 - k) + fly;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.022 + aRnd.z * 0.03) * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        if (a < 0.01) discard;
        vec3 col = mix(vCol * 1.6, vec3(1.0, 0.55, 0.22), 0.45);
        gl_FragColor = vec4(col * a * 1.8, a);
        #include <colorspace_fragment>
      }
    `
  })
  const points = new THREE.Points(pointGeo, pointMat)
  points.frustumCulled = false
  group.add(points)

  // amostra pontos só dentro da silhueta (lendo o alfa do recorte)
  let alphaData: { w: number; h: number; d: Uint8ClampedArray } | null = null
  const img = new Image()
  img.src = '/assets/roberto-cutout.webp'
  img.onload = () => {
    const w = 180
    const h = Math.round(w * meta.aspect)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, w, h)
    alphaData = { w, h, d: ctx.getImageData(0, 0, w, h).data }
    let i = 0
    let guard = 0
    while (i < count && guard++ < count * 40) {
      const u = Math.random()
      // mais partículas perto da base
      const v = Math.random() < 0.6 ? 0.14 + Math.random() * 0.14 : Math.random()
      if (alphaAt(u, v) < 0.6) continue
      uvs[i * 2] = u
      uvs[i * 2 + 1] = v
      rnd.set([Math.random(), Math.random(), Math.random()], i * 3)
      i++
    }
    pointGeo.setDrawRange(0, i)
    ;(pointGeo.attributes.aUv as THREE.BufferAttribute).needsUpdate = true
    ;(pointGeo.attributes.aRnd as THREE.BufferAttribute).needsUpdate = true
  }
  function alphaAt(u: number, v: number) {
    if (!alphaData) return 0
    const x = Math.min(alphaData.w - 1, Math.max(0, Math.floor(u * alphaData.w)))
    const y = Math.min(alphaData.h - 1, Math.max(0, Math.floor((1 - v) * alphaData.h)))
    return alphaData.d[(y * alphaData.w + x) * 4 + 3] / 255
  }

  // ponto acima da cabeça (para o balão de fala)
  const headAnchor = new THREE.Object3D()
  headAnchor.position.set((meta.headTop[0] - 0.5) * width, (meta.headTop[1] - 0.5) * H + 0.35, depthScale * 0.6)
  group.add(headAnchor)

  let scanT = -1
  const baseQ = new THREE.Quaternion()
  const tmpE = new THREE.Euler()
  const tmpQ = new THREE.Quaternion()
  const m4 = new THREE.Matrix4()

  return {
    group,
    mesh,
    headAnchor,
    /** vira o retrato para um ponto (feito uma vez) */
    faceTowards(p: THREE.Vector3) {
      group.lookAt(p.x, group.position.y, p.z)
      baseQ.copy(group.quaternion)
    },
    /** o clique acerta ele de verdade (dentro da silhueta)? */
    hitTest(uv: THREE.Vector2 | undefined) {
      if (!uv) return false
      return uv.y > 0.22 && alphaAt(uv.x, uv.y) > 0.5
    },
    scan() {
      scanT = 0
    },
    update(dt: number, t: number, mouse: THREE.Vector2, dissolve: number, hover: boolean, pointScale: number) {
      uniforms.uTime.value = t
      uniforms.uDissolve.value = dissolve
      uniforms.uScale.value = pointScale
      uniforms.uHover.value = THREE.MathUtils.damp(uniforms.uHover.value, hover ? 1 : 0, 6, dt)
      if (scanT >= 0) {
        scanT += dt / 1.3
        uniforms.uScan.value = 1.05 - scanT * 1.1
        if (scanT > 1) {
          scanT = -1
          uniforms.uScan.value = -1
        }
      }
      // gira de leve seguindo o mouse (o relevo aparece no parallax) + respiração
      tmpE.set(-mouse.y * 0.14, mouse.x * 0.38, 0)
      tmpQ.setFromEuler(tmpE)
      const target = baseQ.clone().multiply(tmpQ)
      group.quaternion.slerp(target, 1 - Math.exp(-dt * 4))
      mesh.scale.y = 1 + Math.sin(t * 1.6) * 0.004
      group.updateMatrixWorld()
      uniforms.uRot.value.setFromMatrix4(m4.extractRotation(group.matrixWorld))
    }
  }
}
