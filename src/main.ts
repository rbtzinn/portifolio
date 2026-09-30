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

import { PROFILE } from './data'
import { IS_TOUCH, REDUCED_MOTION, TIER } from './tier'
import { Ambience } from './audio'
import { buildChapters, createManifest, noiseDataUrl, setupCopyEmail, setupMagnetic } from './ui'
import * as S from './scene/shapes'
import { createDust, createParticles, type Palette } from './scene/particles'

// ————————————————————————————————————————————————————————— utilidades
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt))
const $ = (s: string) => document.querySelector(s) as HTMLElement

document.documentElement.style.setProperty('--noise', `url(${noiseDataUrl()})`)
document.body.classList.add('loading')
const INITIAL_HASH = location.hash.slice(1)

// ————————————————————————————————————————————————————————— UI
const { chapters, railItems } = buildChapters()
const N = chapters.length // 10 capítulos = 10 formas
const audio = new Ambience()
setupMagnetic()

// Paletas (base → topo) de cada forma, na ordem dos capítulos
const PALETTES: Palette[] = [
  ['#ff6a2b', '#6c7bff'], // galáxia
  ['#7b8cff', '#39f3d0'], // </>
  ['#ff4d1f', '#ffd27a'], // Pernambuco (EMPETUR)
  ['#0fbfa9', '#a6fff2'], // celular RFID
  ['#d9a441', '#fff3d1'], // diamante LUXE
  ['#e5213a', '#ff9aa5'], // StreamVibe
  ['#2f6bff', '#a9c4ff'], // Frotas
  ['#8a5cff', '#ff6ad5'], // hélice (experiência)
  ['#39f3d0', '#ff6a2b'], // nó (stack)
  ['#ff6a2b', '#ffd0a8'] // @ (contato)
]

// ————————————————————————————————————————————————————————— renderer
const canvas = $('#scene') as HTMLCanvasElement
let renderer: THREE.WebGLRenderer | null = null
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
} catch {
  document.body.classList.add('no-webgl')
}
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 0, 9)
let dpr = Math.min(devicePixelRatio, TIER.maxDpr)
let composer: EffectComposer | null = null
let bloom: UnrealBloomPass | null = null
if (renderer) {
  renderer.setPixelRatio(dpr)
  renderer.setClearColor('#05060a', 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  if (TIER.bloom) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType }))
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.75, 0.6, 0.12)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }
  $('#gl').textContent = renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL'
}
$('#parts').textContent = `${TIER.particles.toLocaleString('pt-BR')} partículas`

const group = new THREE.Group()
scene.add(group)
let system: ReturnType<typeof createParticles> | null = null
const dust = createDust(TIER.low ? 500 : 1400)
scene.add(dust.points)

// ————————————————————————————————————————————————————————— rolagem
let VH = innerHeight
let lastW = innerWidth
const spacer = $('#spacer')
const layout = () => (spacer.style.height = `${N * VH}px`)
layout()
const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 })
lenis.stop()
let lastScrollAt = 0
let snapping = false
lenis.on('scroll', () => (lastScrollAt = performance.now()))
const progress = () => clamp(lenis.scroll / VH, 0, N - 1)

function goTo(k: number) {
  k = clamp(Math.round(k), 0, N - 1)
  const dist = Math.abs(k - progress())
  snapping = true
  lenis.scrollTo(k * VH, {
    duration: REDUCED_MOTION ? 0.01 : Math.min(1.1 + dist * 0.3, 3),
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

// ————————————————————————————————————————————————————————— modal, contato, som
const manifest = createManifest(
  () => {
    lenis.stop()
    audio.blip(880, 0.12)
  },
  () => lenis.start()
)
setupCopyEmail(() => {
  audio.blip(1760, 0.1)
  pulse(new THREE.Vector3(0, 0, 0))
})
const soundBtn = $('#sound')
soundBtn.addEventListener('click', () => {
  const on = audio.toggle()
  soundBtn.setAttribute('aria-pressed', String(on))
  soundBtn.querySelector('.label')!.textContent = on ? 'Som on' : 'Som'
})

// ————————————————————————————————————————————————————————— ponteiro
const mouse = new THREE.Vector2()
const mouseS = new THREE.Vector2()
const pointer = { x: innerWidth / 2, y: innerHeight / 2 }
let lastPointer = -10
const reader = $('#reader')
const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const hit = new THREE.Vector3()
if (!IS_TOUCH) document.body.classList.add('has-cursor')

addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  pointer.x = e.clientX
  pointer.y = e.clientY
  lastPointer = performance.now()
})
const overUI = (t: EventTarget | null) =>
  !!(t as HTMLElement)?.closest?.('a, button, .manifest, .chips span, .hud, .rail, .card p, .card h2, .log, .stack')

function pointerWorld(target: THREE.Vector3) {
  raycaster.setFromCamera(mouse, camera)
  if (!raycaster.ray.intersectPlane(plane, target)) return null
  return group.worldToLocal(target)
}
function pulse(local: THREE.Vector3) {
  system?.uniforms.uPulse.value.set(local.x, local.y, local.z, 0)
}
addEventListener('pointerdown', (e) => {
  if (overUI(e.target) || manifest.isOpen()) return
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  lastPointer = performance.now()
  const p = pointerWorld(hit)
  if (p) {
    pulse(p)
    audio.blip(520 + Math.random() * 400, 0.09, 0.1)
  }
})

// ————————————————————————————————————————————————————————— redimensionamento
const isPortrait = () => innerWidth / innerHeight < 0.8 || innerWidth <= 820
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

// ————————————————————————————————————————————————————————— capítulos
let current = -1
let entered = false
function setChapter(k: number) {
  if (k === current) return
  const prev = current
  current = k
  railItems.forEach((li, i) => li.classList.toggle('on', i === k))
  $('#cur').textContent = String(k).padStart(2, '0')
  if (prev !== -1) audio.whoosh()
  if (entered) history.replaceState(null, '', k === 0 ? location.pathname : `#${chapters[k].id}`)
  if (k === 1) countUp()
  if (k === 7) lightLog()
}
const chapterState = chapters.map(() => ({ d: 9, v: -1 }))
function updateChapters(f: number, introK: number) {
  chapters.forEach((c, k) => {
    const raw = f - k
    const d = Math.round(clamp(raw, -1, 1) * 1000) / 1000
    let v = 1 - smooth(0.14, 0.46, Math.abs(raw))
    if (k === 0) v *= smooth(0, 0.35, introK)
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
let counted = false
function countUp() {
  if (counted) return
  counted = true
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count)
    const t0 = performance.now()
    const step = () => {
      const k = clamp((performance.now() - t0) / 1200)
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) requestAnimationFrame(step)
    }
    step()
  })
}
let logLit = false
function lightLog() {
  if (logLit) return
  logLit = true
  document.querySelectorAll('#log li').forEach((li, i) => {
    setTimeout(() => {
      li.classList.add('lit')
      audio.blip(660 + i * 180, 0.08, 0.07)
    }, 250 + i * 320)
  })
}

// ————————————————————————————————————————————————————————— laço principal
const timer = new THREE.Timer()
timer.connect(document)
let fS = 0
let introK = 0
let introStart = -1
const frameTimes: number[] = []
let lastAdapt = 0
let fpsAcc = 0
let fpsFrames = 0
const fpsEl = $('#fps')
const tmp2 = new THREE.Vector2()
let mouseK = 0

function frame(time: number) {
  requestAnimationFrame(frame)
  timer.update(time)
  const dt = Math.min(timer.getDelta(), 1 / 20)
  const t = timer.getElapsed()
  lenis.raf(time)

  if (introStart >= 0) introK = clamp((t - introStart) / (REDUCED_MOTION ? 0.01 : 2.8))
  const introE = 1 - Math.pow(1 - introK, 3)

  const f = progress()
  fS = damp(fS, f, REDUCED_MOTION ? 60 : 8, dt)
  updateChapters(fS, introK)
  setChapter(Math.round(fS))

  // encaixe suave no capítulo mais próximo quando a rolagem para
  if (!REDUCED_MOTION && !snapping && !manifest.isOpen() && introK >= 1) {
    const near = Math.round(f)
    if (performance.now() - lastScrollAt > 260 && Math.abs(f - near) > 0.004 && Math.abs(f - near) < 0.49) goTo(near)
  }

  mouseS.x = damp(mouseS.x, mouse.x, 4, dt)
  mouseS.y = damp(mouseS.y, mouse.y, 4, dt)
  if (!IS_TOUCH) reader.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
  reader.classList.toggle('hover', !!document.querySelector('a:hover, button:hover'))

  // FPS no HUD
  fpsAcc += dt
  fpsFrames++
  if (fpsAcc > 0.5) {
    // só exibe o contador quando ele está bonito (a qualidade se ajusta sozinha)
    const fps = Math.round(fpsFrames / fpsAcc)
    fpsEl.textContent = `${fps} fps`
    fpsEl.style.display = fps >= 45 ? '' : 'none'
    fpsAcc = 0
    fpsFrames = 0
  }

  if (!renderer || !system) return

  // ——— câmera: distância, lens shift (conteúdo à esquerda / embaixo) e paralaxe
  const portrait = isPortrait()
  camera.fov = portrait ? 55 : 42
  const dist = (portrait ? 11.5 : 9) + (1 - introE) * 14
  camera.position.set(mouseS.x * 0.5, mouseS.y * 0.3, dist)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  const sx = portrait ? 0 : 0.36
  const sy = portrait ? 0.34 : 0
  camera.projectionMatrix.elements[8] = -sx * introE
  camera.projectionMatrix.elements[9] = -sy * introE
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

  // ——— forma atual
  system.setProgress(fS)
  const morph = system.uniforms.uMorph.value
  const mid = Math.sin(morph * Math.PI)
  const sp = REDUCED_MOTION ? 0 : 1
  group.rotation.y = damp(group.rotation.y, (Math.sin(t * 0.22) * 0.35 + mouseS.x * 0.45) * sp + mid * 0.5, 3, dt)
  group.rotation.x = damp(group.rotation.x, (-mouseS.y * 0.22 + Math.sin(t * 0.17) * 0.06) * sp, 3, dt)
  group.scale.setScalar((0.25 + introE * 0.75) * (portrait ? 0.84 : 1))

  // ——— mouse repele as partículas
  const active = performance.now() - lastPointer < (IS_TOUCH ? 900 : 1800)
  mouseK = damp(mouseK, active ? 1 : 0, 4, dt)
  if (pointerWorld(hit)) system.uniforms.uMouse.value.lerp(hit, 1 - Math.exp(-dt * 10))
  system.uniforms.uMouseK.value = mouseK * sp
  const pw = system.uniforms.uPulse.value
  if (pw.w >= 0) pw.w = pw.w > 3 ? -1 : pw.w + dt

  const bufH = renderer.getDrawingBufferSize(tmp2).y
  const scale = bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  system.uniforms.uScale.value = scale
  system.uniforms.uTime.value = t
  dust.uniforms.uScale.value = scale
  dust.uniforms.uTime.value = t
  dust.points.rotation.y = t * 0.01 + mouseS.x * 0.05

  if (composer) composer.render()
  else renderer.render(scene, camera)

  // ——— qualidade adaptativa
  frameTimes.push(dt)
  if (frameTimes.length > 90) frameTimes.shift()
  if (t - lastAdapt > 2.5 && frameTimes.length >= 60 && introK >= 1) {
    lastAdapt = t
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    if (avg > 1 / 40) {
      if (composer && dpr <= 1.26) {
        composer = null
        bloom = null
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

// ————————————————————————————————————————————————————————— carregamento
const loaderNum = $('#loader-num')
const loaderBar = $('#loader-bar')
const loaderLog = $('#loader-log')
const LOGS = ['compilando shaders…', 'gerando partículas…', 'mapeando Pernambuco…', 'lapidando o diamante…', 'pronto.']
let shown = 0
let real = 0
const loaderStart = performance.now()
function tickLoader() {
  const minT = clamp((performance.now() - loaderStart) / 1500)
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

async function boot() {
  const fonts = Promise.all(['800 360px Syne', '500 16px "JetBrains Mono"'].map((f) => document.fonts.load(f).catch(() => undefined)))
  const pe = fetch('/assets/pe.bin')
    .then((r) => r.arrayBuffer())
    .then((b) => new Int16Array(b))
    .catch(() => new Int16Array(0))
  await Promise.race([fonts, new Promise((r) => setTimeout(r, 3500))])
  real = 0.3
  const peData = await pe
  real = 0.5
  if (renderer) {
    const n = TIER.particles
    const shapes = [
      S.galaxy(n),
      S.codeSymbol(n),
      peData.length ? S.pernambuco(n, peData) : S.galaxy(n),
      S.phone(n),
      S.diamond(n),
      S.screen(n),
      S.pin(n),
      S.helix(n),
      S.knot(n),
      S.atSymbol(n)
    ]
    real = 0.85
    system = createParticles(n, shapes, PALETTES)
    group.add(system.points)
    await new Promise((r) => setTimeout(r, 16))
    try {
      renderer.compile(scene, camera)
    } catch {
      /* ignora */
    }
  }
  real = 1
}

function enter() {
  if (entered) return
  entered = true
  $('#loader').classList.add('done')
  document.body.classList.remove('loading')
  document.body.classList.add('ready')
  introStart = timer.getElapsed()
  lenis.start()
  const idx = chapters.findIndex((c) => c.id === INITIAL_HASH)
  if (idx > 0) setTimeout(() => goTo(idx), 700)
  if (!renderer) introK = 1
}

if (!renderer) introK = 1
boot()
requestAnimationFrame(frame)

console.log(
  `%c✦ ${TIER.particles.toLocaleString('pt-BR')} partículas na GPU %c Curtiu? Bora conversar → ${PROFILE.email}`,
  'background:#ff6a2b;color:#150800;padding:4px 8px;font-weight:700',
  'color:#efeae0'
)
