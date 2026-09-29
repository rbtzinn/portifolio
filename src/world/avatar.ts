import * as THREE from 'three'
import { TIER } from '../tier'
import { glowTexture } from './textures'

/**
 * Avatar do Roberto, construído 100% em código (sem modelo externo):
 * pele morena, cabelo curto degradê, bigode fino + cavanhaque, sorriso largo,
 * camisa vinho, jeans e tênis brancos. Rig articulado com poses procedurais.
 */

type Joint = THREE.Group
type Pose = Record<string, [number, number, number]>

const SKIN = '#a4693f'
const HAIR = '#140e0b'
const SHIRT = '#5c1422'
const JEANS = '#202838'

function mat(color: string, roughness: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  if (TIER.low) return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra })
}

function capsule(r: number, len: number, m: THREE.Material, seg = 12) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - r), 6, seg), m)
  mesh.position.y = -len / 2
  mesh.castShadow = true
  return mesh
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number, name: string, joints: Record<string, Joint>) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.name = name
  parent.add(g)
  joints[name] = g
  return g
}

// ——— textura da tela do notebook: VS Code digitando sozinho
const CODE = [
  ['const ', 'roberto', ' = {'],
  ['  role', ': ', "'Frontend Developer'", ','],
  ['  base', ': ', "'Recife, PE'", ','],
  ['  stack', ': [', "'React'", ', ', "'TS'", ', ', "'Next.js'", '],'],
  ['  disponivel', ': ', 'true', ','],
  ['}'],
  [''],
  ['porto', '.', 'atracar', '(roberto)', ' // ⚓']
]
const COLORS: Record<string, string> = {
  'const ': '#c586c0',
  roberto: '#9cdcfe',
  true: '#569cd6',
  porto: '#4ec9b0',
  atracar: '#dcdcaa',
  ' // ⚓': '#6a9955'
}
function tokenColor(t: string) {
  if (COLORS[t]) return COLORS[t]
  if (t.startsWith("'")) return '#ce9178'
  if (t.startsWith('  ')) return '#9cdcfe'
  return '#d4d4d4'
}

function createScreen() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 320
  const ctx = c.getContext('2d')!
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const total = CODE.reduce((a, l) => a + l.join('').length + 1, 0)
  let typed = 0
  let acc = 0
  const draw = (blink: boolean) => {
    ctx.fillStyle = '#1b1c22'
    ctx.fillRect(0, 0, 512, 320)
    ctx.fillStyle = '#26272f'
    ctx.fillRect(0, 0, 512, 26)
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(16 + i * 16, 13, 5, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.fillStyle = '#8b8d98'
    ctx.font = '500 13px "JetBrains Mono", monospace'
    ctx.fillText('portfolio.ts', 72, 18)
    ctx.font = '500 17px "JetBrains Mono", monospace'
    let left = typed
    let cx = 0
    let cy = 0
    CODE.forEach((line, li) => {
      const y = 58 + li * 30
      ctx.fillStyle = '#4a4c57'
      ctx.fillText(String(li + 1).padStart(2, ' '), 10, y)
      let x = 46
      for (const tok of line) {
        if (left <= 0) break
        const part = tok.slice(0, Math.max(0, left))
        ctx.fillStyle = tokenColor(tok)
        ctx.fillText(part, x, y)
        x += ctx.measureText(part).width
        left -= tok.length
        cx = x
        cy = y
      }
      left -= 1
    })
    if (blink) {
      ctx.fillStyle = '#ff6a2b'
      ctx.fillRect(cx + 1, cy - 15, 9, 19)
    }
    tex.needsUpdate = true
  }
  draw(true)
  return {
    tex,
    update(dt: number, t: number, speed: number) {
      acc += dt * speed
      let changed = false
      while (acc > 0.055) {
        acc -= 0.055
        typed++
        changed = true
        if (typed > total + 40) typed = 0 // pausa no fim e recomeça
      }
      const blink = Math.floor(t * 2.2) % 2 === 0
      if (changed || blink !== (tex.userData.blink as boolean)) {
        tex.userData.blink = blink
        draw(blink)
      }
    }
  }
}

export function createAvatar() {
  const root = new THREE.Group()
  const joints: Record<string, Joint> = {}

  const skin = mat(SKIN, 0.52, { sheen: 0.35, sheenColor: new THREE.Color('#ff9a6a'), sheenRoughness: 0.6, clearcoat: 0.08 })
  const hair = mat(HAIR, 0.95, { sheen: 0.6, sheenColor: new THREE.Color('#3a2a22') })
  const shirt = mat(SHIRT, 0.78, { sheen: 0.45, sheenColor: new THREE.Color('#9a3446'), sheenRoughness: 0.6 })
  const jeans = mat(JEANS, 0.85, { sheen: 0.5, sheenColor: new THREE.Color('#5a6a8a') })
  const white = mat('#e8e4dc', 0.6)
  const sole = mat('#2a2a2c', 0.8)
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#120b08', roughness: 0.15, clearcoat: 1 })
  const lipMat = mat('#5a2a20', 0.5)
  const teeth = mat('#f4efe6', 0.35)

  // ——— tronco
  const hips = joint(root, 0, 0.92, 0, 'hips', joints)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), jeans)
  pelvis.scale.set(1.12, 0.72, 0.82)
  hips.add(pelvis)
  const spine = joint(hips, 0, 0.06, 0, 'spine', joints)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.26, 8, 18), shirt)
  torso.scale.set(1.14, 1, 0.74)
  torso.position.y = 0.21
  torso.castShadow = true
  spine.add(torso)
  // botões e colarinho
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), mat('#3a0e15', 0.4))
    b.position.set(0, 0.36 - i * 0.085, 0.125 - Math.abs(i - 1.5) * 0.003)
    spine.add(b)
  }
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.01), shirt)
  placket.position.set(0, 0.24, 0.121)
  spine.add(placket)
  const chest = joint(spine, 0, 0.37, 0, 'chest', joints)
  for (const s of [-1, 1]) {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.012), shirt)
    collar.position.set(s * 0.045, 0.045, 0.085)
    collar.rotation.set(-0.5, s * 0.5, s * 0.55)
    chest.add(collar)
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.12, 14), skin)
  neck.position.y = 0.06
  chest.add(neck)

  // ——— cabeça (levemente maior, estilo "designer toy")
  const head = joint(chest, 0, 0.1, 0.005, 'head', joints)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), skin)
  skull.scale.set(0.9, 1.07, 0.98)
  skull.position.y = 0.13
  skull.castShadow = true
  head.add(skull)
  // mandíbula mais larga, puxando o formato do rosto
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), skin)
  jaw.scale.set(0.95, 0.72, 0.95)
  jaw.position.set(0, 0.06, 0.02)
  head.add(jaw)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skin)
    ear.scale.set(0.45, 1, 0.75)
    ear.position.set(s * 0.137, 0.12, -0.005)
    head.add(ear)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), skin)
  nose.scale.set(1.05, 0.9, 0.95)
  nose.position.set(0, 0.105, 0.147)
  head.add(nose)
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.04, 4, 8), skin)
  bridge.position.set(0, 0.135, 0.142)
  bridge.rotation.x = -0.25
  head.add(bridge)

  // olhos
  const eyes: THREE.Mesh[] = []
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), mat('#8a5433', 0.6))
    socket.scale.set(1.2, 0.8, 0.5)
    socket.position.set(s * 0.05, 0.145, 0.128)
    head.add(socket)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), eyeMat)
    eye.scale.set(1.15, 0.8, 0.6)
    eye.position.set(s * 0.05, 0.145, 0.138)
    head.add(eye)
    eyes.push(eye)
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.045, 4, 6), hair)
    brow.rotation.z = Math.PI / 2 + s * 0.12
    brow.position.set(s * 0.052, 0.182, 0.132)
    head.add(brow)
  }

  // boca sorrindo com dentes, bigode fino e cavanhaque
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 8, 24, Math.PI), lipMat)
  smile.rotation.set(0.25, 0, Math.PI)
  smile.position.set(0, 0.075, 0.138)
  head.add(smile)
  const teethBand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), teeth)
  teethBand.scale.set(1.1, 0.42, 0.35)
  teethBand.position.set(0, 0.078, 0.14)
  teethBand.rotation.x = 0.25
  head.add(teethBand)
  const stache = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0065, 6, 20, Math.PI), hair)
  stache.position.set(0, 0.078, 0.142)
  stache.scale.set(1.05, 0.28, 1)
  stache.rotation.x = -0.2
  head.add(stache)
  const goatee = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 10), hair)
  goatee.scale.set(0.7, 0.42, 0.34)
  goatee.position.set(0, 0.03, 0.128)
  head.add(goatee)
  // barba rala: casca escura translúcida na metade de baixo da mandíbula
  const stubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.123, 24, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: HAIR, roughness: 1, transparent: true, opacity: 0.38, depthWrite: false })
  )
  stubble.scale.copy(jaw.scale)
  stubble.position.copy(jaw.position)
  head.add(stubble)

  // cabelo curto (topo mais escuro + degradê nas laterais)
  const fade = new THREE.Mesh(new THREE.SphereGeometry(0.153, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.43), mat('#3b2a20', 0.95))
  fade.scale.copy(skull.scale)
  fade.position.copy(skull.position)
  fade.rotation.x = -0.5
  head.add(fade)
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.166, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.34), hair)
  top.scale.set(0.92, 1.1, 1)
  top.position.copy(skull.position).add(new THREE.Vector3(0, 0.002, -0.004))
  top.rotation.x = -0.2
  head.add(top)

  // ——— braços
  const arm = (side: 1 | -1) => {
    const n = side === 1 ? 'L' : 'R'
    const sh = joint(chest, side * 0.2, 0.0, -0.005, 'shoulder' + n, joints)
    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), shirt)
    sh.add(shoulderBall)
    sh.add(capsule(0.058, 0.28, shirt))
    const el = joint(sh, 0, -0.28, 0, 'elbow' + n, joints)
    const sleeve = capsule(0.052, 0.12, shirt)
    el.add(sleeve)
    const fore = capsule(0.043, 0.24, skin)
    el.add(fore)
    const hd = joint(el, 0, -0.25, 0, 'hand' + n, joints)
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), skin)
    palm.scale.set(0.8, 1.05, 0.5)
    palm.position.y = -0.04
    hd.add(palm)
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.04, 4, 6), skin)
    thumb.position.set(side * -0.035, -0.035, 0.018)
    thumb.rotation.z = side * 0.6
    hd.add(thumb)
  }
  arm(1)
  arm(-1)

  // ——— pernas
  const leg = (side: 1 | -1) => {
    const n = side === 1 ? 'L' : 'R'
    const th = joint(hips, side * 0.095, -0.02, 0, 'thigh' + n, joints)
    th.add(capsule(0.078, 0.42, jeans))
    const kn = joint(th, 0, -0.42, 0, 'knee' + n, joints)
    kn.add(capsule(0.064, 0.4, jeans))
    const ft = joint(kn, 0, -0.41, 0, 'foot' + n, joints)
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.13, 6, 10), white)
    shoe.rotation.x = Math.PI / 2
    shoe.scale.set(1.05, 1, 0.8)
    shoe.position.set(0, -0.025, 0.05)
    ft.add(shoe)
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.24), sole)
    s2.position.set(0, -0.065, 0.05)
    ft.add(s2)
  }
  leg(1)
  leg(-1)

  // ——— notebook (fica no colo quando sentado)
  const laptop = new THREE.Group()
  const alu = new THREE.MeshStandardMaterial({ color: '#8d9099', roughness: 0.35, metalness: 0.85 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.25), alu)
  laptop.add(base)
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshStandardMaterial({ color: '#1a1b1f', roughness: 0.7 }))
  keys.rotation.x = -Math.PI / 2
  keys.position.set(0, 0.0095, -0.02)
  laptop.add(keys)
  const lid = new THREE.Group()
  lid.position.set(0, 0.009, -0.125)
  lid.rotation.x = -1.85
  laptop.add(lid)
  const lidShell = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.012, 0.24), alu)
  lidShell.position.z = 0.12
  lid.add(lidShell)
  const screenCtl = createScreen()
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.33, 0.21),
    new THREE.MeshBasicMaterial({ map: screenCtl.tex, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) })
  )
  screen.rotation.x = Math.PI / 2
  screen.rotation.z = Math.PI
  screen.position.set(0, -0.0068, 0.12)
  lid.add(screen)
  // logo iluminado na tampa (voltado para quem está de frente)
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.028, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a3a').multiplyScalar(3) }))
  logo.rotation.x = -Math.PI / 2
  logo.position.set(0, 0.0068, 0.12)
  lid.add(logo)
  const screenLight = new THREE.PointLight('#9cc4ff', 1.6, 2.2, 1.6)
  screenLight.position.set(0, 0.2, 0.05)
  laptop.add(screenLight)
  root.add(laptop)

  // ——— café com vapor
  const mug = new THREE.Group()
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 18), mat('#efeae0', 0.4, { clearcoat: 0.6 }))
  cup.position.y = 0.05
  mug.add(cup)
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.041, 18), new THREE.MeshStandardMaterial({ color: '#2a160c', roughness: 0.2 }))
  coffee.rotation.x = -Math.PI / 2
  coffee.position.y = 0.092
  mug.add(coffee)
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 14), cup.material)
  handle.position.set(0.05, 0.05, 0)
  mug.add(handle)
  const steam: THREE.Sprite[] = []
  const glow = glowTexture()
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#c9ccd6', transparent: true, depthWrite: false, opacity: 0 }))
    sp.userData.phase = i / 4
    mug.add(sp)
    steam.push(sp)
  }
  root.add(mug)

  // ——— lanterna (capítulo do farol)
  const lantern = new THREE.Group()
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.13, 10), new THREE.MeshStandardMaterial({ color: '#1b1c20', metalness: 0.7, roughness: 0.4, wireframe: false }))
  lantern.add(cage)
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46e').multiplyScalar(6) }))
  lantern.add(flame)
  const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffb055', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  lanternGlow.scale.setScalar(0.9)
  lantern.add(lanternGlow)
  const lanternLight = new THREE.PointLight('#ffb766', 0, 7, 1.6)
  lantern.add(lanternLight)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 14), cage.material)
  ring.position.y = 0.1
  lantern.add(ring)
  joints.handL.add(lantern)
  lantern.position.set(0, -0.2, 0.02)

  // sombra de contato
  const blobC = document.createElement('canvas')
  blobC.width = blobC.height = 64
  const bx = blobC.getContext('2d')!
  const bg = bx.createRadialGradient(32, 32, 0, 32, 32, 32)
  bg.addColorStop(0, 'rgba(0,0,0,0.6)')
  bg.addColorStop(1, 'rgba(0,0,0,0)')
  bx.fillStyle = bg
  bx.fillRect(0, 0, 64, 64)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobC), transparent: true, depthWrite: false }))
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.012
  root.add(blob)

  // luz de recorte quente (lanterna do píer) + preenchimento frio da lua para modelar o rosto
  const key = new THREE.PointLight('#ffb47a', 2.4, 5, 1.4)
  key.position.set(-0.9, 2.1, 1.1)
  root.add(key)
  const rim = new THREE.PointLight('#7d9cff', 1.6, 5, 1.4)
  rim.position.set(0.9, 1.8, -0.9)
  root.add(rim)

  const hit: THREE.Object3D[] = []
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== blob) hit.push(o)
  })

  // ——— poses
  const SIT: Pose = {
    hips: [0, 0, 0],
    spine: [0.14, 0, 0],
    chest: [0.08, 0, 0],
    head: [0.42, 0, 0],
    thighL: [-1.52, 0, 0.07],
    thighR: [-1.52, 0, -0.07],
    kneeL: [1.62, 0, 0],
    kneeR: [1.62, 0, 0],
    footL: [0.1, 0, 0],
    footR: [0.1, 0, 0],
    shoulderL: [-0.62, 0, 0.12],
    shoulderR: [-0.62, 0, -0.12],
    elbowL: [-1.05, 0, -0.1],
    elbowR: [-1.05, 0, 0.1],
    handL: [0.5, 0, 0],
    handR: [0.5, 0, 0]
  }
  const STAND: Pose = {
    hips: [0, 0, 0],
    spine: [0, 0, 0],
    chest: [0, 0, 0],
    head: [0, 0, 0],
    thighL: [0, 0, 0.03],
    thighR: [0, 0, -0.03],
    kneeL: [0.05, 0, 0],
    kneeR: [0.05, 0, 0],
    footL: [0, 0, 0],
    footR: [0, 0, 0],
    // esquerda segura a lanterna à frente
    shoulderL: [-0.75, 0, 0.18],
    shoulderR: [0.05, 0, -0.1],
    elbowL: [-0.75, 0, 0],
    elbowR: [-0.18, 0, 0],
    handL: [0.3, 0, 0],
    handR: [0, 0, 0]
  }
  const names = Object.keys(SIT)

  const state = {
    sit: 1,
    wave: 0,
    waveT: 0,
    typing: 1,
    look: new THREE.Vector2(),
    lookW: 0,
    blinkT: 2,
    hover: 0
  }
  const tmpV = new THREE.Vector3()
  const tmpQ = new THREE.Quaternion()

  return {
    root,
    hit,
    headJoint: head,
    laptop,
    lantern,
    wave() {
      state.waveT = 2.6
    },
    isWaving: () => state.waveT > 0,
    /**
     * @param sit 1 = sentado com notebook, 0 = em pé com lanterna
     * @param lookAt ponto no mundo para onde a cabeça olha (ou null)
     * @param lookWeight 0..1 quanto ele desvia o olhar da tela
     */
    update(dt: number, t: number, sit: number, lookAt: THREE.Vector3 | null, lookWeight: number, hover: boolean) {
      state.sit = sit
      state.waveT = Math.max(0, state.waveT - dt)
      state.wave = THREE.MathUtils.damp(state.wave, state.waveT > 0.3 ? 1 : 0, 6, dt)
      state.hover = THREE.MathUtils.damp(state.hover, hover ? 1 : 0, 6, dt)
      const lw = Math.max(lookWeight, state.wave, state.hover)
      state.lookW = THREE.MathUtils.damp(state.lookW, lw, 4, dt)
      state.typing = THREE.MathUtils.damp(state.typing, sit * (1 - state.lookW * 0.85), 5, dt)

      // pose base
      for (const n of names) {
        const a = SIT[n]
        const b = STAND[n]
        joints[n].rotation.set(b[0] + (a[0] - b[0]) * sit, b[1] + (a[1] - b[1]) * sit, b[2] + (a[2] - b[2]) * sit)
      }
      // altura do quadril: sentado na borda
      joints.hips.position.y = 0.92 * (1 - sit) + 0.1 * sit

      // respiração e peso
      const br = Math.sin(t * 1.7)
      joints.spine.rotation.x += br * 0.015
      joints.chest.scale.setScalar(1 + br * 0.008)
      if (sit < 0.5) {
        joints.hips.rotation.z = Math.sin(t * 0.8) * 0.025
        joints.spine.rotation.z = -Math.sin(t * 0.8) * 0.02
      }

      // pernas balançando sobre a água
      joints.kneeL.rotation.x += Math.sin(t * 1.3) * 0.16 * sit
      joints.kneeR.rotation.x += Math.sin(t * 1.3 + 2.1) * 0.16 * sit

      // digitando
      const ty = state.typing
      joints.handL.rotation.x += (Math.sin(t * 17) * 0.08 + Math.sin(t * 29) * 0.05) * ty
      joints.handR.rotation.x += (Math.sin(t * 19 + 1) * 0.08 + Math.sin(t * 23) * 0.05) * ty
      joints.elbowL.rotation.x += Math.abs(Math.sin(t * 8.5)) * 0.05 * ty
      joints.elbowR.rotation.x += Math.abs(Math.sin(t * 9.3 + 2)) * 0.05 * ty
      // quando para de digitar, as mãos repousam
      joints.elbowL.rotation.x += (1 - ty) * sit * 0.35
      joints.elbowR.rotation.x += (1 - ty) * sit * 0.35
      joints.head.rotation.x -= (1 - ty) * sit * 0.4

      // aceno (braço direito)
      const w = state.wave
      if (w > 0.001) {
        const sR = joints.shoulderR.rotation
        sR.x += (-0.25 - sR.x) * w
        sR.z += (-2.55 - sR.z) * w
        const eR = joints.elbowR.rotation
        eR.x += (0 - eR.x) * w
        eR.z += (Math.sin(t * 10) * 0.5 - 0.35 - eR.z) * w
        joints.handR.rotation.z = Math.sin(t * 10 + 0.6) * 0.3 * w
        joints.head.rotation.z += Math.sin(t * 2) * 0.06 * w
        joints.spine.rotation.z += 0.06 * w
      }

      // olhar
      if (lookAt) {
        joints.chest.updateWorldMatrix(true, false)
        joints.head.getWorldPosition(tmpV)
        const dir = lookAt.clone().sub(tmpV)
        joints.chest.getWorldQuaternion(tmpQ)
        dir.applyQuaternion(tmpQ.invert()).normalize()
        const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -1.1, 1.1)
        const pitch = THREE.MathUtils.clamp(-Math.asin(dir.y), -0.55, 0.5)
        state.look.x = THREE.MathUtils.damp(state.look.x, yaw, 6, dt)
        state.look.y = THREE.MathUtils.damp(state.look.y, pitch, 6, dt)
      }
      const k = state.lookW
      joints.head.rotation.y = joints.head.rotation.y * (1 - k) + state.look.x * k
      joints.head.rotation.x = joints.head.rotation.x * (1 - k) + state.look.y * k
      joints.chest.rotation.y += state.look.x * 0.25 * k

      // piscar
      state.blinkT -= dt
      const blinking = state.blinkT < 0.12
      if (state.blinkT < 0) state.blinkT = 2 + Math.random() * 3.5
      for (const e of eyes) e.scale.y = blinking ? 0.1 : 0.8

      // notebook no colo
      laptop.visible = sit > 0.5
      laptop.position.set(0, joints.hips.position.y + 0.085, 0.3)
      laptop.rotation.set(0.06, 0, 0)
      screenCtl.update(dt, t, laptop.visible ? 1 + ty : 0)

      // café ao lado
      mug.visible = sit > 0.5
      mug.position.set(0.38, 0, 0.08)
      steam.forEach((s) => {
        const ph = (t * 0.35 + s.userData.phase) % 1
        s.position.set(Math.sin(t * 1.5 + ph * 6) * 0.02, 0.11 + ph * 0.28, 0)
        s.scale.setScalar(0.05 + ph * 0.14)
        ;(s.material as THREE.SpriteMaterial).opacity = Math.sin(ph * Math.PI) * 0.22
      })

      // lanterna na mão
      lantern.visible = sit < 0.5
      const flick = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 31) * 0.05
      lanternLight.intensity = lantern.visible ? 3.2 * flick : 0
      lanternGlow.scale.setScalar(0.8 * flick)
      lantern.rotation.x = -joints.shoulderL.rotation.x - joints.elbowL.rotation.x - joints.handL.rotation.x + Math.sin(t * 2) * 0.1

      blob.scale.setScalar(sit > 0.5 ? 0.9 : 0.75)
    }
  }
}
