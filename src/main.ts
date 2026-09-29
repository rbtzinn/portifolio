import '@fontsource/syne/latin-700.css'
import '@fontsource/syne/latin-800.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import './style.css'
import * as THREE from 'three'
import Lenis from 'lenis'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import { PROFILE, PROJECTS } from './data'
import { IS_TOUCH, REDUCED_MOTION, TIER } from './tier'
import { Ambience } from './audio'
import { buildChapters, createManifest, noiseDataUrl, setupCopyEmail, setupMagnetic, toast } from './ui'
import { createSky, FOG_COLOR, MOON_DIR, skyUniforms } from './world/sky'
import { createWater, waterUniforms } from './world/water'
import { createPort } from './world/port'
import { createLighthouse } from './world/lighthouse'
import { createBuoys } from './world/buoys'
import { createBadge } from './world/badge'
import { createPortrait } from './world/portrait'
import { PORTRAIT_POS, BADGE_POS, LANTERN, LIFT_HEIGHT, PROJECT_SLOTS, QUAY_TOP } from './world/layout'

// ————————————————————————————————————————————————————————— utilidades
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt))
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const $ = (s: string) => document.querySelector(s) as HTMLElement

document.documentElement.style.setProperty('--noise', `url(${noiseDataUrl()})`)
document.body.classList.add('loading')
const INITIAL_HASH = location.hash.slice(1)

// ————————————————————————————————————————————————————————— UI
const { chapters, railItems } = buildChapters()
const N = chapters.length // 10 paradas
const audio = new Ambience()
setupMagnetic()

// ————————————————————————————————————————————————————————— paradas da câmera
type Stop = {
  pos: THREE.Vector3
  look: THREE.Vector3
  shift: [number, number]
  mShift: [number, number]
  mZoom: number
  mPos?: THREE.Vector3
  mLook?: THREE.Vector3
}
const LIFT_Y = QUAY_TOP + 2.59 / 2 + LIFT_HEIGHT
const STOPS: Stop[] = [
  {
    // chegada: câmera baixa na ponta do píer, com o Roberto programando em primeiro plano
    pos: v3(4.3, 2.15, 80.6),
    look: v3(2.2, 5.6, -40),
    shift: [0, 0],
    mShift: [0, 0.3],
    mZoom: 1,
    mPos: v3(3.3, 2.25, 81.2),
    mLook: PORTRAIT_POS.clone().add(v3(0, 0.2, 0))
  },
  {
    pos: BADGE_POS.clone().add(v3(0.5, 0.2, 7.4)),
    look: BADGE_POS.clone(),
    shift: [0.42, 0],
    mShift: [0, 0.4],
    mZoom: 1.4
  },
  ...PROJECT_SLOTS.map((s) => ({
    pos: v3(s.x + 3.2, LIFT_Y + 2.6, s.z + 21),
    look: v3(s.x, LIFT_Y - 0.4, s.z),
    shift: [0.4, 0.02] as [number, number],
    mShift: [0, 0.42] as [number, number],
    mZoom: 1.55
  })),
  { pos: v3(62, 17, 78), look: v3(96, 1, 30), shift: [0.34, 0.05], mShift: [0, 0.42], mZoom: 1.15 },
  { pos: v3(10, 66, 30), look: v3(-2, 2, -46), shift: [0.36, 0], mShift: [0, 0.42], mZoom: 1.1 },
  { pos: v3(121, 6, 48), look: v3(152, 17, -12), shift: [0.36, 0.06], mShift: [0, 0.38], mZoom: 1.25 }
]
const INTRO_POS = v3(-10, 46, 210)
const INTRO_LOOK = v3(0, 18, 0)

// ————————————————————————————————————————————————————————— cena
const canvas = $('#scene') as HTMLCanvasElement
let renderer: THREE.WebGLRenderer | null = null
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
} catch {
  document.body.classList.add('no-webgl')
}

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0062)
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 1400)
camera.position.copy(INTRO_POS)

let dpr = Math.min(devicePixelRatio, TIER.maxDpr)
let composer: EffectComposer | null = null
let bloom: UnrealBloomPass | null = null
if (renderer) {
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace
  if (!TIER.low) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  if (TIER.bloom) {
    composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 })
    )
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.78)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }
}

// iluminação global: lua fria + rebatimento quente do sódio
scene.add(new THREE.HemisphereLight('#3a4a78', '#6b3a1c', 0.75))
const moon = new THREE.DirectionalLight('#9fb4ff', 1.1)
moon.position.copy(MOON_DIR).multiplyScalar(-100).setY(80)
scene.add(moon)
const sodium = new THREE.DirectionalLight('#ff9a50', 1.4)
sodium.position.set(20, 30, 60)
scene.add(sodium)

// ————————————————————————————————————————————————————————— mundo (montado depois do carregamento)
type World = {
  sky: THREE.Group
  water: ReturnType<typeof createWater>
  port: ReturnType<typeof createPort>
  light: ReturnType<typeof createLighthouse>
  buoys: ReturnType<typeof createBuoys>
  badge: ReturnType<typeof createBadge>
  portrait: ReturnType<typeof createPortrait>
  rings: THREE.Mesh[]
  motes: THREE.Points
  moteMat: THREE.ShaderMaterial
}
let world: World | null = null

/** Environment map noturno gerado da própria cena: céu + faixas de luz de sódio no horizonte. */
function buildEnvironment(r: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  env.add(createSky())
  const sodium = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a4a').multiplyScalar(6), side: THREE.DoubleSide })
  const white = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe6c8').multiplyScalar(4), side: THREE.DoubleSide })
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), i % 3 ? sodium : white)
    m.position.set(Math.cos(a) * 120, 14 + (i % 4) * 3, Math.sin(a) * 120)
    m.lookAt(0, m.position.y, 0)
    env.add(m)
  }
  const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe6ff').multiplyScalar(5) }))
  moonDisc.position.copy(MOON_DIR).multiplyScalar(400)
  env.add(moonDisc)
  const pm = new THREE.PMREMGenerator(r)
  const rt = pm.fromScene(env, 0.02, 0.1, 1000)
  pm.dispose()
  return rt.texture
}

function buildWorld(photo?: HTMLImageElement): World {
  if (renderer) {
    scene.environment = buildEnvironment(renderer)
    scene.environmentIntensity = 0.55
  }
  const sky = createSky()
  scene.add(sky)
  const water = createWater()
  scene.add(water.mesh)
  const port = createPort()
  scene.add(port.group)
  const light = createLighthouse()
  scene.add(light.group)
  const buoys = createBuoys()
  scene.add(buoys.group)
  const badge = createBadge(photo)
  scene.add(badge.anchor)
  const portrait = createPortrait(2.6)
  portrait.group.position.copy(PORTRAIT_POS)
  portrait.faceTowards(STOPS[0].pos)
  scene.add(portrait.group)

  // ondas RFID que saem do contêiner em foco
  const rings: THREE.Mesh[] = []
  const ringGeo = new THREE.RingGeometry(0.96, 1, 64)
  ringGeo.rotateX(-Math.PI / 2)
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: '#ff7a3a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    m.userData.phase = i / 3
    scene.add(m)
    rings.push(m)
  }

  // partículas de maresia que dão profundidade perto da câmera
  const n = TIER.low ? 260 : 600
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 60, Math.random() * 30, (Math.random() - 0.5) * 60], i * 3)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const moteMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCam; uniform float uScale;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.2 + position.y) * 2.0 + uTime * 0.6;
        p.y += sin(uTime * 0.3 + position.x * 0.3) * 1.0;
        // repete os pontos num volume de 60 m em torno da câmera
        p = uCam + mod(p - uCam + 30.0, 60.0) - 30.0;
        p.y = max(p.y, 0.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        vA = smoothstep(1.0, 6.0, d) * smoothstep(38.0, 12.0, d);
        gl_PointSize = 0.12 * uScale / d;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.55;
        gl_FragColor = vec4(vec3(1.0, 0.8, 0.6) * a, a);
        #include <colorspace_fragment>
      }
    `
  })
  const motes = new THREE.Points(g, moteMat)
  motes.frustumCulled = false
  scene.add(motes)

  return { sky, water, port, light, buoys, badge, portrait, rings, motes, moteMat }
}

// ————————————————————————————————————————————————————————— rolagem
let VH = innerHeight
let lastW = innerWidth
const spacer = $('#spacer')
const layout = () => {
  spacer.style.height = `${N * VH}px`
}
layout()

const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 })
lenis.stop()
let lastScrollAt = 0
let snapping = false
lenis.on('scroll', () => {
  lastScrollAt = performance.now()
})
const progress = () => clamp(lenis.scroll / VH, 0, N - 1)

function goTo(k: number) {
  k = clamp(Math.round(k), 0, N - 1)
  const dist = Math.abs(k - progress())
  snapping = true
  lenis.scrollTo(k * VH, {
    duration: REDUCED_MOTION ? 0.01 : Math.min(1.2 + dist * 0.35, 3.2),
    easing: easeInOut,
    onComplete: () => (snapping = false)
  })
}
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLElement>('[data-go]')
  if (a) {
    e.preventDefault()
    goTo(Number(a.dataset.go))
  }
})
addEventListener('keydown', (e) => {
  if (manifest.isOpen()) return
  const tag = (document.activeElement?.tagName ?? '').toLowerCase()
  if (tag === 'input' || tag === 'textarea') return
  if (e.key === ' ' && (tag === 'button' || tag === 'a')) return
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault()
    goTo(Math.floor(progress() + 0.5) + 1)
  } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
    e.preventDefault()
    goTo(Math.ceil(progress() - 0.5) - 1)
  } else if (e.key === 'Home') goTo(0)
  else if (e.key === 'End') goTo(N - 1)
})

// ————————————————————————————————————————————————————————— manifesto / contato
const manifest = createManifest(
  () => {
    lenis.stop()
    audio.blip(880, 0.12)
  },
  () => lenis.start()
)
setupCopyEmail(() => {
  audio.blip(1760, 0.1)
  flashBeam = 1
})

const soundBtn = $('#sound')
soundBtn.addEventListener('click', () => {
  const on = audio.toggle()
  soundBtn.setAttribute('aria-pressed', String(on))
  soundBtn.querySelector('.label')!.textContent = on ? 'Som on' : 'Som'
})

// ————————————————————————————————————————————————————————— ponteiro / leitor RFID
const mouse = new THREE.Vector2()
const mouseS = new THREE.Vector2()
const pointerPx = { x: innerWidth / 2, y: innerHeight / 2 }
const reader = $('#reader')
const readerLabel = $('#reader-label')
const raycaster = new THREE.Raycaster()
let hoverProject = -1
let hoverBadge = false
let hoverAvatar = false
let scanP = 0
let scanned = -1
let needsRay = false
let drag: { x: number; y: number; moved: number; id: number } | null = null
let flashBeam = 0

if (!IS_TOUCH) document.body.classList.add('has-cursor')
addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  pointerPx.x = e.clientX
  pointerPx.y = e.clientY
  needsRay = true
  if (drag && e.pointerId === drag.id && world) {
    const dx = e.clientX - drag.x
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y)
    world.badge.kick(dx * 0.045)
    drag.x = e.clientX
    drag.y = e.clientY
  }
})
const overUI = (t: EventTarget | null) =>
  !!(t as HTMLElement)?.closest?.('a, button, .manifest, .chips span, .hud, .rail')

canvas.addEventListener('pointerdown', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycast()
  if (hoverBadge) drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }
})
addEventListener('pointerup', (e) => {
  if (drag && e.pointerId === drag.id) {
    if (drag.moved < 8 && world) world.badge.flipCard()
    drag = null
  }
})
addEventListener('pointercancel', () => (drag = null))
canvas.addEventListener('click', (e) => {
  if (overUI(e.target)) return
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycast()
  if (hoverProject >= 0) {
    manifest.show(hoverProject)
  } else if (hoverAvatar) greet()
})
// os capítulos ficam por cima do canvas: repassa cliques em áreas vazias para a cena
document.getElementById('chapters')!.addEventListener('click', (e) => {
  if (overUI(e.target)) return
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycast()
  if (hoverProject >= 0) manifest.show(hoverProject)
  else if (hoverAvatar) greet()
})
document.getElementById('chapters')!.addEventListener('pointerdown', (e) => {
  if (overUI(e.target)) return
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycast()
  if (hoverBadge) drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }
})

function raycast() {
  hoverProject = -1
  hoverBadge = false
  hoverAvatar = false
  if (!world || manifest.isOpen()) return
  raycaster.setFromCamera(mouse, camera)
  const f = progress()
  if (world.portrait.group.visible && f < 0.4) hoverAvatar = world.portrait.hitTest(raycaster.intersectObject(world.portrait.mesh, false)[0]?.uv)
  if (f > 0.5 && f < 1.6) {
    hoverBadge = raycaster.intersectObjects(world.badge.hit, false).length > 0
  }
  if (f > 1.4 && f < 7.2) {
    const hit = raycaster.intersectObjects(
      world.port.projects.map((p) => p.mesh),
      false
    )[0]
    if (hit) hoverProject = hit.object.userData.projectIndex as number
  }
}

// ————————————————————————————————————————————————————————— avatar: aceno + balão de fala
const bubble = $('#bubble')
let bubbleT = 0
const HELLOS = [
  'Oi! Eu sou o Roberto 👋',
  'Bora construir algo juntos?',
  'Tô compilando umas ideias aqui…',
  'Bem-vindo ao Porto de Sinais ⚓',
  'Clicou de novo? Gostei de você 😄'
]
let helloI = 0
function say(text: string, secs = 3.4) {
  bubble.textContent = text
  bubble.classList.add('show')
  bubbleT = secs
}
function greet(text?: string) {
  if (!world) return
  world.portrait.scan()
  audio.blip(990, 0.08)
  setTimeout(() => audio.blip(1320, 0.08), 110)
  say(text ?? HELLOS[helloI++ % HELLOS.length])
}

// ————————————————————————————————————————————————————————— redimensionamento
function resize() {
  const w = innerWidth
  const h = innerHeight
  if (w !== lastW || Math.abs(h - VH) > 160) {
    const f = progress()
    VH = h
    layout()
    lenis.resize()
    lenis.scrollTo(f * VH, { immediate: true })
  }
  lastW = w
  camera.aspect = w / h
  if (renderer) {
    renderer.setSize(w, h, false)
    composer?.setSize(w, h)
    bloom?.setSize(w / 2, h / 2)
  }
}
addEventListener('resize', resize)
resize()

// ————————————————————————————————————————————————————————— estado do diretor
const camPos = new THREE.Vector3().copy(INTRO_POS)
const camLook = new THREE.Vector3().copy(INTRO_LOOK)
const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()
const shift = new THREE.Vector2()
let fS = 0
let introK = 0
let introStart = -1
let current = -1
let beamAngle = 0
let aim = 0
const isPortrait = () => innerWidth / innerHeight < 0.8 || innerWidth <= 820

function stopPose(i: number, outPos: THREE.Vector3, outLook: THREE.Vector3, outShift: THREE.Vector2) {
  const s = STOPS[i]
  outLook.copy(s.look)
  outPos.copy(s.pos)
  if (isPortrait()) {
    if (s.mPos) outPos.copy(s.mPos)
    if (s.mLook) outLook.copy(s.mLook)
    outPos.sub(outLook).multiplyScalar(s.mZoom).add(outLook)
    outShift.set(s.mShift[0], s.mShift[1])
  } else outShift.set(s.shift[0], s.shift[1])
}

const pA = new THREE.Vector3()
const lA = new THREE.Vector3()
const sA = new THREE.Vector2()
const pB = new THREE.Vector3()
const lB = new THREE.Vector3()
const sB = new THREE.Vector2()

function direct(f: number, out: { pos: THREE.Vector3; look: THREE.Vector3; shift: THREE.Vector2 }) {
  const i = Math.min(Math.floor(f), N - 2)
  const t = easeInOut(smooth(0.12, 0.88, f - i))
  stopPose(i, pA, lA, sA)
  stopPose(i + 1, pB, lB, sB)
  out.pos.lerpVectors(pA, pB, t)
  out.look.lerpVectors(lA, lB, t)
  out.shift.lerpVectors(sA, sB, t)
  // arco de "drone" entre paradas
  const hop = Math.min(14, pA.distanceTo(pB) * 0.12)
  out.pos.y += Math.sin(t * Math.PI) * hop
}

const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: new THREE.Vector2() }

function setChapter(k: number) {
  if (k === current) return
  const prev = current
  current = k
  railItems.forEach((li, i) => li.classList.toggle('on', i === k))
  $('#cur').textContent = String(k).padStart(2, '0')
  if (prev !== -1) {
    const sl = $('.scanline')
    sl.classList.remove('go')
    void sl.offsetWidth
    sl.classList.add('go')
    audio.whoosh()
  }
  if (k === N - 1) setTimeout(() => current === N - 1 && audio.horn(), 500)
  if (entered) history.replaceState(null, '', k === 0 ? location.pathname : `#${chapters[k].id}`)
}

const chapterState = chapters.map(() => ({ d: 9, v: -1 }))
function updateChapters(f: number) {
  chapters.forEach((c, k) => {
    const raw = f - k
    const d = Math.round(clamp(raw, -1, 1) * 1000) / 1000
    let v = 1 - smooth(0.14, 0.46, Math.abs(raw))
    if (k === 0) v *= introK > 0 ? smooth(0, 0.35, introK) : 0
    v = Math.round(v * 1000) / 1000
    const st = chapterState[k]
    if (st.d !== d || st.v !== v) {
      c.style.setProperty('--d', String(d))
      c.style.setProperty('--v', String(v))
      c.classList.toggle('visible', v > 0.001)
      c.classList.toggle('active', v > 0.55)
      st.d = d
      st.v = v
    }
  })
}

// HUD de coordenadas (Suape ≈ 8°23′S 34°57′W)
const latEl = $('#lat')
const lonEl = $('#lon')
const altEl = $('#alt')
function dms(v: number, pos: string, neg: string) {
  const a = Math.abs(v)
  const d = Math.floor(a)
  const m = Math.floor((a - d) * 60)
  const s = ((a - d) * 60 - m) * 60
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′${s.toFixed(1).padStart(4, '0')}″${v >= 0 ? pos : neg}`
}
let hudT = 0

// ————————————————————————————————————————————————————————— laço principal
const clock = new THREE.Timer()
clock.connect(document)
const frameTimes: number[] = []
let lastAdapt = 0
const logItems = () => document.querySelectorAll('#log li')
let logLit = -1

function frame(time: number) {
  requestAnimationFrame(frame)
  clock.update(time)
  const dt = Math.min(clock.getDelta(), 1 / 20)
  const t = clock.getElapsed()
  lenis.raf(time)

  // introdução
  if (introStart >= 0) introK = clamp((t - introStart) / (REDUCED_MOTION ? 0.01 : 3.6))
  const introE = 1 - Math.pow(1 - introK, 4)

  const f = progress()
  fS = damp(fS, f, REDUCED_MOTION ? 60 : 9, dt)
  updateChapters(fS)
  setChapter(Math.round(fS))

  // encaixe suave na parada mais próxima quando a rolagem para
  if (!REDUCED_MOTION && !snapping && !drag && !manifest.isOpen() && introK >= 1) {
    const idle = performance.now() - lastScrollAt
    const near = Math.round(f)
    if (idle > 260 && Math.abs(f - near) > 0.004 && Math.abs(f - near) < 0.49) goTo(near)
  }

  mouseS.x = damp(mouseS.x, mouse.x, 4, dt)
  mouseS.y = damp(mouseS.y, mouse.y, 4, dt)

  // cursor
  if (!IS_TOUCH) {
    reader.style.transform = `translate3d(${pointerPx.x}px, ${pointerPx.y}px, 0)`
  }

  if (!world || !renderer) return

  // câmera
  direct(fS, pose)
  if (introK < 1) {
    pose.pos.lerpVectors(INTRO_POS, pose.pos, introE)
    pose.look.lerpVectors(INTRO_LOOK, pose.look, introE)
    pose.shift.multiplyScalar(introE)
  }
  const par = REDUCED_MOTION ? 0 : 1
  camPos.copy(pose.pos)
  camLook.copy(pose.look)
  // paralaxe do mouse no espaço da câmera + respiro
  tmpA.subVectors(camLook, camPos).normalize()
  tmpB.crossVectors(tmpA, camera.up).normalize()
  const dist = camPos.distanceTo(camLook)
  const k = Math.min(dist * 0.035, 1.6) * par
  camPos.addScaledVector(tmpB, mouseS.x * k)
  camPos.y += mouseS.y * k * 0.6 + Math.sin(t * 0.6) * 0.12 * par
  camera.position.copy(camPos)
  camera.lookAt(camLook)
  camera.fov = isPortrait() ? 55 : 42
  camera.updateProjectionMatrix()
  shift.copy(pose.shift)
  // lens shift: desloca o ponto focal na tela sem girar a câmera
  camera.projectionMatrix.elements[8] = -shift.x
  camera.projectionMatrix.elements[9] = -shift.y
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

  const W = world
  W.sky.position.copy(camera.position)
  W.water.follow(camera)
  skyUniforms.uTime.value = t
  waterUniforms.uTime.value = t
  W.port.glowMat.uniforms.uTime.value = t
  const bufH = renderer.getDrawingBufferSize(tmpVec2).y
  const scale = bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  W.port.glowMat.uniforms.uScale.value = scale
  W.buoys.routeUniforms.uScale.value = scale
  W.moteMat.uniforms.uScale.value = scale
  W.moteMat.uniforms.uTime.value = t
  W.moteMat.uniforms.uCam.value.copy(camera.position)
  W.buoys.routeUniforms.uTime.value = t

  // ——— crachá e cancela
  const badgeV = 1 - smooth(0.2, 0.8, Math.abs(fS - 1))
  W.badge.update(dt, t, mouseS, badgeV)
  const arm = W.port.booth.userData.arm as THREE.Mesh
  arm.rotation.z = damp(arm.rotation.z, fS > 1.35 ? Math.PI / 2.3 : 0, 3, dt)

  // ——— contêineres dos projetos + pórtico
  let focus = -1
  let focusLift = 0
  W.port.projects.forEach((p, i) => {
    const stop = 2 + i
    const target = 1 - smooth(0.25, 0.7, Math.abs(fS - stop))
    p.lift = damp(p.lift, target, 3.2, dt)
    const e = easeInOut(clamp(p.lift))
    p.mesh.position.set(p.base.x, p.base.y + e * LIFT_HEIGHT, p.base.z)
    p.mesh.rotation.y = Math.sin(t * 0.7 + i) * 0.035 * e
    p.mesh.rotation.z = Math.sin(t * 1.1 + i) * 0.012 * e
    const hovered = hoverProject === i
    const face = p.mesh.userData.face as THREE.MeshStandardMaterial
    face.emissiveIntensity = damp(face.emissiveIntensity, e * 0.22 + (hovered ? 0.35 : 0), 6, dt)
    const edges = p.mesh.userData.edges as THREE.LineSegments
    ;(edges.material as THREE.LineBasicMaterial).opacity = damp(
      (edges.material as THREE.LineBasicMaterial).opacity,
      Math.max(e * 0.9, hovered ? 1 : 0),
      6,
      dt
    )
    if (e > focusLift) {
      focusLift = e
      focus = i
    }
  })
  const gx = PROJECT_SLOTS[0].x + clamp(fS - 2, 0, 4) * (PROJECT_SLOTS[1].x - PROJECT_SLOTS[0].x)
  W.port.gantry.position.x = damp(W.port.gantry.position.x, gx, 5, dt)
  const legH = W.port.legH
  const topY = QUAY_TOP + legH + 0.5
  const cTop = focus >= 0 ? W.port.projects[focus].mesh.position.y + 2.59 / 2 + 0.2 : QUAY_TOP + 9
  const spreaderY = focusLift > 0.02 ? cTop : QUAY_TOP + 10
  const sp = W.port.spreader
  sp.position.set(0, damp(sp.position.y, spreaderY - QUAY_TOP, 6, dt), 1)
  const cableLen = topY - QUAY_TOP - sp.position.y
  W.port.cables.forEach((c) => {
    c.scale.y = Math.max(cableLen, 0.01)
    c.position.set(c.position.x, sp.position.y + cableLen / 2, 1)
  })
  W.port.trolley.position.z = 1
  if (focus >= 0) {
    const fp = W.port.projects[focus].mesh.position
    W.port.spot.target.position.set(fp.x - W.port.gantry.position.x, fp.y - QUAY_TOP - 3, fp.z - W.port.gantry.position.z)
    W.port.spot.intensity = damp(W.port.spot.intensity, 380 * focusLift + 40, 4, dt)
    waterUniforms.uFocus.value.copy(fp)
    waterUniforms.uFocusColor.value.set(PROJECTS[focus].color)
  }
  // ondas RFID
  W.rings.forEach((r) => {
    if (focus < 0 || focusLift < 0.2) {
      ;(r.material as THREE.MeshBasicMaterial).opacity = 0
      return
    }
    const fp = W.port.projects[focus].base
    const ph = (t * 0.55 + r.userData.phase) % 1
    r.position.set(fp.x, QUAY_TOP + 0.05, fp.z)
    r.scale.setScalar(1 + ph * 11)
    ;(r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.55 * focusLift
    ;(r.material as THREE.MeshBasicMaterial).color.set(PROJECTS[focus].accent)
  })

  // ——— boias do diário de bordo
  const logV = 1 - smooth(0.2, 0.6, Math.abs(fS - 7))
  W.buoys.routeUniforms.uReveal.value = damp(W.buoys.routeUniforms.uReveal.value, smooth(6.4, 7, fS) * 1.05, 2, dt)
  let lit = -1
  W.buoys.buoys.forEach((b, i) => {
    const on = logV > 0.5 && W.buoys.routeUniforms.uReveal.value > 0.18 + i * 0.2 ? 1 : 0
    if (on) lit = i
    b.lit = damp(b.lit, on, 4, dt)
    const blink = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + b.phase))
    b.lampMat.color.setRGB(1, 0.75, 0.4).multiplyScalar(0.25 + b.lit * 5 * blink)
    b.group.position.y = Math.sin(t * 1.3 + b.phase) * 0.25
    b.group.rotation.z = Math.sin(t * 1.1 + b.phase) * 0.08
  })
  if (lit !== logLit) {
    logLit = lit
    logItems().forEach((li, i) => li.classList.toggle('lit', i <= lit))
    if (lit >= 0) audio.blip(660 + lit * 180, 0.09, 0.08)
  }

  // ——— farol: gira sozinho e, no capítulo final, se vira para você
  const contactK = smooth(8.3, 8.95, fS)
  beamAngle += dt * (0.55 - contactK * 0.3)
  tmpA.subVectors(camera.position, LANTERN)
  const toCam = Math.atan2(-tmpA.z, tmpA.x)
  const wob = 0.16 + Math.sin(t * 0.8) * 0.1
  const diff = Math.atan2(Math.sin(toCam + wob - beamAngle), Math.cos(toCam + wob - beamAngle))
  aim = beamAngle + diff * contactK
  W.light.pivot.rotation.y = aim
  const face = Math.pow(Math.abs(Math.cos(aim - toCam)), 10)
  const flareM = W.light.flare.material as THREE.SpriteMaterial
  flareM.opacity = 0.35 + face * 0.9
  W.light.flare.scale.setScalar(5 + face * 22)
  ;(W.light.streak.material as THREE.SpriteMaterial).opacity = face * 0.8
  W.light.streak.scale.set(20 + face * 90, 1.2 + face * 1.5, 1)
  // inclina levemente o feixe para a câmera
  W.light.pivot.rotation.z = -contactK * Math.atan2(LANTERN.y - camera.position.y, tmpA.setY(0).length()) * 0.9
  flashBeam = damp(flashBeam, 0, 1.5, dt)
  W.light.beamUniforms.uIntensity.value = 0.9 + contactK * 1.1 + flashBeam * 1.5
  const facing = Math.max(0, Math.cos(beamAngle - toCam))
  waterUniforms.uBeam.value = Math.max(contactK, Math.pow(facing, 30) * 0.8) + flashBeam
  skyUniforms.uFlash.value = contactK * (0.3 + 0.1 * Math.sin(t * 2)) + flashBeam * 0.4 + Math.pow(facing, 60) * 0.3

  // ——— retrato 3D real (some em partículas ao rolar)
  const pr = W.portrait
  const dissolve = smooth(0.06, 0.85, fS)
  pr.group.visible = fS < 0.95
  if (pr.group.visible) {
    const par2 = REDUCED_MOTION ? 0 : 1
    pr.update(dt, t, tmpVec2.set(mouseS.x * par2, mouseS.y * par2), dissolve, hoverAvatar, scale)
  }
  if (bubbleT > 0) {
    bubbleT -= dt
    if (bubbleT <= 0 || !pr.group.visible || dissolve > 0.3) {
      bubble.classList.remove('show')
      bubbleT = 0
    }
    pr.headAnchor.getWorldPosition(tmpA)
    tmpA.project(camera)
    bubble.style.transform = `translate3d(${((tmpA.x + 1) / 2) * innerWidth}px, ${((1 - tmpA.y) / 2) * innerHeight}px, 0)`
  }

  // ——— luzes piscantes
  W.port.blinkers.forEach((b) => {
    b.mesh.visible = Math.sin(t * b.rate + b.phase) > 0.2
  })

  // ——— leitor RFID
  if (needsRay || fS !== f) {
    raycast()
    needsRay = false
  }
  const scanning = hoverProject >= 0
  scanP = scanning ? Math.min(1, scanP + dt / 0.7) : Math.max(0, scanP - dt * 3)
  reader.style.setProperty('--p', scanP.toFixed(3))
  reader.classList.toggle('scan', scanning)
  reader.classList.toggle('hover', hoverBadge || hoverAvatar || !!document.querySelector('a:hover, button:hover'))
  if (scanning && scanP >= 1 && scanned !== hoverProject) {
    scanned = hoverProject
    audio.blip(1480, 0.08)
    readerLabel.textContent = `Tag lida · ${PROJECTS[hoverProject].code} · clique`
  } else if (scanning && scanP < 1) {
    readerLabel.textContent = 'Lendo tag…'
  } else if (!scanning) {
    scanned = -1
    readerLabel.textContent = hoverBadge ? 'Arraste · clique para virar' : hoverAvatar ? 'Clique · escanear' : ''
  }
  canvas.style.cursor = IS_TOUCH ? '' : 'none'

  // HUD
  hudT += dt
  if (hudT > 0.1) {
    hudT = 0
    latEl.textContent = dms(-(8.3931 + (camera.position.z - 40) * 0.000012), 'N', 'S')
    lonEl.textContent = dms(-(34.9617 - camera.position.x * 0.000011), 'E', 'W')
    altEl.textContent = `ALT ${String(Math.max(0, Math.round(camera.position.y))).padStart(3, '0')} m`
  }

  // render
  if (composer) composer.render()
  else renderer.render(scene, camera)

  // qualidade adaptativa
  frameTimes.push(dt)
  if (frameTimes.length > 90) frameTimes.shift()
  if (t - lastAdapt > 2.5 && frameTimes.length >= 60 && introK >= 1) {
    lastAdapt = t
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    if (avg > 1 / 38) {
      if (composer && dpr <= 1.26) {
        composer = null
        bloom = null
        renderer.toneMapping = THREE.ACESFilmicToneMapping
      } else if (dpr > 1) {
        dpr = Math.max(1, dpr - 0.25)
        renderer.setPixelRatio(dpr)
        composer?.setPixelRatio(dpr)
        resize()
      }
      frameTimes.length = 0
    }
  }
}
const tmpVec2 = new THREE.Vector2()

// ————————————————————————————————————————————————————————— carregamento
const loaderNum = $('#loader-num')
const loaderBar = $('#loader-bar')
const loaderLog = $('#loader-log')
const LOGS = ['estabelecendo sinal…', 'sincronizando a maré…', 'lendo tags RFID…', 'acendendo o farol…', 'abrindo o portão…']
let shown = 0
let real = 0
const loaderStart = performance.now()
function tickLoader() {
  const minT = clamp((performance.now() - loaderStart) / 1700)
  const target = Math.min(real, minT)
  shown += (target - shown) * 0.12
  if (target >= 1 && shown > 0.995) shown = 1
  loaderNum.textContent = String(Math.round(shown * 100)).padStart(3, '0')
  loaderBar.style.transform = `scaleX(${shown})`
  loaderLog.textContent = LOGS[Math.min(LOGS.length - 1, Math.floor(shown * LOGS.length))]
  if (shown < 1) requestAnimationFrame(tickLoader)
  else enter()
}
requestAnimationFrame(tickLoader)

function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((res) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => res(img)
    img.onerror = () => res(undefined)
    img.src = src
  })
}

async function boot() {
  const fontLoads = ['800 76px Syne', '700 32px Syne', '500 22px "JetBrains Mono"', '700 22px "JetBrains Mono"', '500 16px Manrope'].map(
    (f) => document.fonts.load(f).catch(() => undefined)
  )
  const steps = [...fontLoads, loadImage(PROFILE.photo)]
  let done = 0
  steps.forEach((p) => p.then(() => (real = Math.max(real, (++done / steps.length) * 0.7))))
  const timeout = new Promise((r) => setTimeout(r, 4500))
  await Promise.race([Promise.all(fontLoads), timeout])
  const photo = await Promise.race([steps[steps.length - 1] as Promise<HTMLImageElement | undefined>, timeout.then(() => undefined)])
  if (renderer) {
    world = buildWorld(photo)
    real = 0.85
    // pré-compila os shaders para evitar travadas na primeira vez que aparecem
    await new Promise((r) => setTimeout(r, 16))
    try {
      renderer.compile(scene, camera)
    } catch {
      /* ignora */
    }
  }
  real = 1
}

let entered = false
function enter() {
  if (entered) return
  entered = true
  $('#loader').classList.add('done')
  document.body.classList.remove('loading')
  document.body.classList.add('ready')
  introStart = clock.getElapsed()
  if (!INITIAL_HASH) setTimeout(() => progress() < 0.3 && greet(HELLOS[helloI++]), REDUCED_MOTION ? 400 : 3800)
  lenis.start()
  // entrada via link profundo (#farol etc.)
  const idx = chapters.findIndex((c) => c.id === INITIAL_HASH)
  if (idx > 0) setTimeout(() => goTo(idx), 900)
  if (!renderer) {
    introK = 1
    toast('Seu navegador não suporta WebGL. Mostrando a versão leve.')
  }
}

// no-WebGL: mantém o laço de UI rodando e a introdução completa
if (!renderer) introK = 1

boot()
requestAnimationFrame(frame)

// console easter egg para os curiosos
console.log(
  '%c⚓ Porto de Sinais %c Olá, dev curioso! Bora conversar? → ' + PROFILE.email,
  'background:#ff6a2b;color:#150800;padding:4px 8px;font-weight:700',
  'color:#efeae0'
)
