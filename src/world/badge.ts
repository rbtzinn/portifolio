import * as THREE from 'three'
import { EDUCATION, PROFILE } from '../data'
import { BADGE_POS } from './layout'

const W = 2.3
const H = 3.3
const R = 0.16
const D = 0.045

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  // furo do clipe
  const hole = new THREE.Path()
  const hw = 0.28
  const hy = h / 2 - 0.2
  hole.moveTo(-hw, hy - 0.05)
  hole.lineTo(hw, hy - 0.05)
  hole.lineTo(hw, hy + 0.05)
  hole.lineTo(-hw, hy + 0.05)
  hole.lineTo(-hw, hy - 0.05)
  s.holes.push(hole)
  return s
}

function remapUV(g: THREE.BufferGeometry, flip = false) {
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + W / 2) / W
    uv[i * 2] = flip ? 1 - u : u
    uv[i * 2 + 1] = (pos.getY(i) + H / 2) / H
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

function cardCanvas() {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = Math.round((768 * H) / W)
  return c
}

function drawFront(c: HTMLCanvasElement, photo?: HTMLImageElement) {
  const ctx = c.getContext('2d')!
  const w = c.width
  const h = c.height
  ctx.fillStyle = '#efeae0'
  ctx.fillRect(0, 0, w, h)
  // faixa superior
  ctx.fillStyle = '#ff6a2b'
  ctx.fillRect(0, 0, w, 150)
  ctx.fillStyle = '#1a0d06'
  ctx.font = '700 24px "JetBrains Mono", monospace'
  ctx.fillText('PORTO DE SINAIS', 44, 116)
  ctx.textAlign = 'right'
  ctx.fillText('CREDENCIAL Nº 2004', w - 44, 116)
  ctx.textAlign = 'left'
  // foto
  const px = 44
  const py = 190
  const pw = w - 88
  const ph = 520
  ctx.save()
  roundRect(ctx, px, py, pw, ph, 18)
  ctx.clip()
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(px, py, pw, ph)
  if (photo) {
    const s = Math.max(pw / photo.width, ph / photo.height)
    const iw = photo.width * s
    const ih = photo.height * s
    ctx.drawImage(photo, px + (pw - iw) / 2, py + (ph - ih) / 2 + 20, iw, ih)
  }
  // cantoneiras de "scanner"
  ctx.restore()
  ctx.strokeStyle = '#ff6a2b'
  ctx.lineWidth = 6
  const k = 44
  for (const [x, y, dx, dy] of [
    [px + 14, py + 14, 1, 1],
    [px + pw - 14, py + 14, -1, 1],
    [px + 14, py + ph - 14, 1, -1],
    [px + pw - 14, py + ph - 14, -1, -1]
  ]) {
    ctx.beginPath()
    ctx.moveTo(x, y + dy * k)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * k, y)
    ctx.stroke()
  }
  // nome
  ctx.fillStyle = '#111'
  ctx.font = '800 76px "Syne", sans-serif'
  ctx.fillText('ROBERTO', 44, 796)
  ctx.fillText('MIRANDA', 44, 868)
  ctx.font = '600 26px "JetBrains Mono", monospace'
  ctx.fillStyle = '#ff5a14'
  ctx.fillText('DESENVOLVEDOR FRONTEND', 44, 912)
  // campos
  ctx.fillStyle = '#333'
  ctx.font = '500 20px "JetBrains Mono", monospace'
  const rows = [
    ['BASE', 'RECIFE · PE'],
    ['ACESSO', 'TODAS AS ÁREAS'],
    ['STATUS', 'DISPONÍVEL · REMOTO/HÍBRIDO']
  ]
  rows.forEach(([a, b], i) => {
    ctx.globalAlpha = 0.55
    ctx.fillText(a, 44, 958 + i * 28)
    ctx.globalAlpha = 1
    ctx.fillText(b, 170, 958 + i * 28)
  })
  // código de barras
  let x = 44
  let seed = 2004
  while (x < w - 44) {
    seed = (seed * 16807) % 2147483647
    const bw = 2 + (seed % 5)
    ctx.fillStyle = '#111'
    ctx.fillRect(x, h - 50, bw, 30)
    x += bw + 2 + (seed % 3)
  }
  ctx.font = '600 16px "JetBrains Mono", monospace'
  ctx.fillText('RBTU·ACCESS·' + new Date().getFullYear(), 44, h - 60)
}

function drawBack(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!
  const w = c.width
  const h = c.height
  ctx.fillStyle = '#121318'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ff6a2b'
  ctx.fillRect(0, 0, w, 150)
  ctx.fillStyle = '#1a0d06'
  ctx.font = '700 24px "JetBrains Mono", monospace'
  ctx.fillText('VERSO · FORMAÇÃO', 44, 116)
  ctx.fillStyle = '#efeae0'
  ctx.font = '800 58px "Syne", sans-serif'
  ctx.fillText('Formação', 44, 250)
  let y = 330
  for (const e of EDUCATION) {
    ctx.font = '700 32px "Syne", sans-serif'
    ctx.fillStyle = '#efeae0'
    ctx.fillText(e.what, 44, y)
    ctx.font = '500 22px "JetBrains Mono", monospace'
    ctx.fillStyle = '#ff8a4d'
    ctx.fillText(e.where, 44, y + 38)
    y += 118
  }
  ctx.fillStyle = '#efeae0'
  ctx.font = '800 58px "Syne", sans-serif'
  ctx.fillText('Idiomas', 44, y + 40)
  ctx.font = '500 24px "JetBrains Mono", monospace'
  ctx.fillStyle = '#c9c4ba'
  ctx.fillText('Português, nativo', 44, y + 96)
  ctx.fillText('Inglês, intermediário (técnico)', 44, y + 134)
  ctx.fillStyle = '#ff8a4d'
  ctx.font = '600 22px "JetBrains Mono", monospace'
  ctx.fillText('Certificado EBAC · Set 2025', 44, h - 150)
  ctx.fillStyle = '#efeae0'
  ctx.fillText(PROFILE.email, 44, h - 100)
  ctx.globalAlpha = 0.5
  ctx.fillText('Se encontrar, devolva ao remetente :)', 44, h - 56)
  ctx.globalAlpha = 1
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function strapTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 1024
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#111216'
  ctx.fillRect(0, 0, 64, 1024)
  ctx.save()
  ctx.translate(40, 0)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = '#ff6a2b'
  ctx.font = '700 22px "JetBrains Mono", monospace'
  for (let y = 0; y < 1024; y += 200) ctx.fillText('RBTZINN ✦ RECIFE ', y, 0)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapT = THREE.RepeatWrapping
  return t
}

export function createBadge(photo: HTMLImageElement | undefined) {
  // O pivô fica no ponto de ancoragem; o crachá pende abaixo dele como um pêndulo
  const anchor = new THREE.Group()
  const STRAP = 3.2
  anchor.position.copy(BADGE_POS).add(new THREE.Vector3(0, H / 2 + STRAP, 0))
  const swing = new THREE.Group()
  anchor.add(swing)
  const card = new THREE.Group()
  card.position.y = -STRAP - H / 2
  swing.add(card)

  const shape = roundedShape(W, H, R)
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 6 }),
    new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 0.5 })
  )
  body.position.z = -D / 2
  card.add(body)

  const frontC = cardCanvas()
  drawFront(frontC, photo)
  const frontT = new THREE.CanvasTexture(frontC)
  frontT.colorSpace = THREE.SRGBColorSpace
  frontT.anisotropy = 8
  const backC = cardCanvas()
  drawBack(backC)
  const backT = new THREE.CanvasTexture(backC)
  backT.colorSpace = THREE.SRGBColorSpace
  backT.anisotropy = 8

  const faceGeo = new THREE.ShapeGeometry(shape, 6)
  remapUV(faceGeo)
  const front = new THREE.Mesh(
    faceGeo,
    new THREE.MeshPhysicalMaterial({ map: frontT, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 })
  )
  front.position.z = D / 2 + 0.002
  card.add(front)
  const backGeo = new THREE.ShapeGeometry(shape, 6)
  remapUV(backGeo, true)
  const back = new THREE.Mesh(
    backGeo,
    new THREE.MeshPhysicalMaterial({ map: backT, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.2, side: THREE.BackSide })
  )
  back.position.z = -D / 2 - 0.002
  card.add(back)

  // clipe metálico
  const clip = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.34, 0.1),
    new THREE.MeshStandardMaterial({ color: '#b9bcc4', metalness: 1, roughness: 0.25 })
  )
  clip.position.set(0, H / 2 - 0.02, 0)
  card.add(clip)

  // cordão
  const strapT = strapTexture()
  strapT.repeat.set(1, 1)
  const strap = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, STRAP + 0.2),
    new THREE.MeshStandardMaterial({ map: strapT, roughness: 0.8, side: THREE.DoubleSide })
  )
  strap.position.y = -STRAP / 2
  swing.add(strap)

  // luz de preenchimento só para o crachá
  const key = new THREE.PointLight('#ffe7cc', 14, 12, 1.4)
  key.position.set(1.8, -STRAP, 3.5)
  swing.add(key)
  const rim = new THREE.PointLight('#5c8cff', 8, 10, 1.4)
  rim.position.set(-2.5, -STRAP - 1, -1.5)
  swing.add(rim)

  const state = {
    rx: 0,
    rz: 0,
    vx: 0,
    vz: 0,
    spin: 0,
    spinV: 0,
    flip: 0
  }

  return {
    anchor,
    swing,
    card,
    hit: [front, back, body],
    state,
    update(dt: number, t: number, mouse: THREE.Vector2, active: number) {
      // pêndulo amortecido + balanço suave
      const k = 18
      const damp = 3.2
      const idle = Math.sin(t * 0.9) * 0.03
      const tx = mouse.y * 0.12 * active
      const tz = -mouse.x * 0.14 * active + idle
      state.vx += (-(state.rx - tx) * k - state.vx * damp) * dt
      state.vz += (-(state.rz - tz) * k - state.vz * damp) * dt
      state.rx += state.vx * dt
      state.rz += state.vz * dt
      // giro livre com atrito e retorno para a face virada
      state.spinV *= Math.exp(-dt * 1.6)
      const rest = state.flip * Math.PI
      state.spinV += -Math.sin(state.spin - rest) * 7 * dt
      state.spin += state.spinV * dt
      swing.rotation.set(state.rx, state.spin + Math.sin(t * 0.5) * 0.08, state.rz)
    },
    kick(v: number) {
      state.spinV += v
    },
    flipCard() {
      state.flip = state.flip ? 0 : 1
      state.spinV += state.flip ? 5 : -5
    }
  }
}
