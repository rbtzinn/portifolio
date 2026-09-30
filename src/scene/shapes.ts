import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

/**
 * Cada forma é uma nuvem de N pontos (Float32Array N*3) centrada na origem,
 * com raio ~2.4. As partículas se transformam de uma forma para a próxima.
 */

let seed = 1337
export const rand = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const gauss = () => {
  let u = 0
  for (let i = 0; i < 4; i++) u += rand()
  return (u - 2) / 2
}

function fromSampler(geo: THREE.BufferGeometry, n: number, out: Float32Array, offset = 0, count = n, m?: THREE.Matrix4) {
  const mesh = new THREE.Mesh(geo)
  const s = new MeshSurfaceSampler(mesh).build()
  const p = new THREE.Vector3()
  for (let i = offset; i < offset + count; i++) {
    s.sample(p)
    if (m) p.applyMatrix4(m)
    out.set([p.x, p.y, p.z], i * 3)
  }
}

/** Amostra pixels de um texto desenhado em canvas. */
function textPoints(text: string, n: number, width: number, depth: number, font = '800 360px Syne') {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 600
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 600, 310)
  const d = ctx.getImageData(0, 0, 1200, 600).data
  const px: number[] = []
  let minX = 1e9
  let maxX = -1e9
  for (let y = 0; y < 600; y += 2)
    for (let x = 0; x < 1200; x += 2)
      if (d[(y * 1200 + x) * 4 + 3] > 128) {
        px.push(x, y)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
  const out = new Float32Array(n * 3)
  const k = width / Math.max(1, maxX - minX)
  const cx = (minX + maxX) / 2
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rand() * (px.length / 2)) * 2
    out.set(
      [(px[j] - cx + rand() * 2) * k, (310 - px[j + 1] + rand() * 2) * k, (rand() - 0.5) * depth],
      i * 3
    )
  }
  return out
}

/** Galáxia espiral com núcleo brilhante. */
export function galaxy(n: number) {
  const out = new Float32Array(n * 3)
  const arms = 3
  for (let i = 0; i < n; i++) {
    if (i < n * 0.22) {
      const r = Math.abs(gauss()) * 0.5
      const th = rand() * Math.PI * 2
      const ph = Math.acos(2 * rand() - 1)
      out.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3)
    } else {
      const r = 0.25 + Math.pow(rand(), 0.8) * 2.7
      const a = (Math.floor(rand() * arms) / arms) * Math.PI * 2 + r * 1.35
      const spread = 0.12 + r * 0.14
      out.set(
        [Math.cos(a) * r + gauss() * spread, gauss() * 0.09 * (3 - r), Math.sin(a) * r + gauss() * spread],
        i * 3
      )
    }
  }
  // inclina o disco para a câmera
  return rotate(out, new THREE.Euler(0.55, 0, -0.18))
}

export const codeSymbol = (n: number) => textPoints('</>', n, 4.6, 0.6)
export const atSymbol = (n: number) => textPoints('@', n, 3.3, 0.7, '800 520px Syne')

/** Pernambuco: municípios como colunas de um mapa de calor 3D. */
export function pernambuco(n: number, data: Int16Array) {
  const out = new Float32Array(n * 3)
  const count = data.length / 3
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rand() * count) * 3
    const x = (data[j] / 32767) * 2.7
    const z = (data[j + 1] / 32767) * 2.7
    const h = data[j + 2] / 32767
    const H = h * 2.8
    const top = rand() < 0.3
    const y = top ? H : H * Math.pow(rand(), 0.6)
    out.set([x, y - 0.7, z], i * 3)
  }
  return rotate(out, new THREE.Euler(0.95, -0.25, 0.08))
}

/** Celular com ondas RFID saindo do topo. */
export function phone(n: number) {
  const out = new Float32Array(n * 3)
  const W = 1.25
  const H = 2.5
  for (let i = 0; i < n; i++) {
    const r = rand()
    let p: [number, number, number]
    if (r < 0.42) {
      // contorno arredondado com espessura
      const t = rand()
      const per = 2 * (W + H)
      let d = t * per
      let x: number
      let y: number
      if (d < W) [x, y] = [-W / 2 + d, H / 2]
      else if ((d -= W) < H) [x, y] = [W / 2, H / 2 - d]
      else if ((d -= H) < W) [x, y] = [W / 2 - d, -H / 2]
      else [x, y] = [-W / 2, -H / 2 + (d - W)]
      p = [x * 0.98 + gauss() * 0.02, y * 0.98 + gauss() * 0.02, gauss() * 0.06]
    } else if (r < 0.62) {
      // tela com linhas de lista (inventário)
      const row = Math.floor(rand() * 9)
      p = [(rand() - 0.5) * W * 0.8, H * 0.36 - row * 0.24 + gauss() * 0.02, 0.04]
    } else {
      // arcos concêntricos
      const k = Math.floor(rand() * 4)
      const R = 0.7 + k * 0.42
      const a = Math.PI * (0.18 + rand() * 0.64)
      p = [Math.cos(a) * R, H / 2 + 0.15 + Math.sin(a) * R * 0.85, gauss() * 0.05]
    }
    out.set(p, i * 3)
  }
  return rotate(center(out, 0, -0.55), new THREE.Euler(0.05, -0.35, 0))
}

/** Diamante lapidado (LUXE). */
export function diamond(n: number) {
  const out = new Float32Array(n * 3)
  const prof = [new THREE.Vector2(0, -1.7), new THREE.Vector2(1.9, 0.25), new THREE.Vector2(1.25, 0.95), new THREE.Vector2(0, 0.95)]
  const geo = new THREE.LatheGeometry(prof, 10).toNonIndexed()
  fromSampler(geo, n, out, 0, Math.floor(n * 0.75))
  // arestas marcadas
  const edges = new THREE.EdgesGeometry(new THREE.LatheGeometry(prof, 10), 1)
  const e = edges.attributes.position.array as Float32Array
  const segs = e.length / 6
  for (let i = Math.floor(n * 0.75); i < n; i++) {
    const s = Math.floor(rand() * segs) * 6
    const t = rand()
    out.set([e[s] + (e[s + 3] - e[s]) * t, e[s + 1] + (e[s + 4] - e[s + 1]) * t, e[s + 2] + (e[s + 5] - e[s + 2]) * t], i * 3)
  }
  return rotate(center(out, 0, 0.3), new THREE.Euler(0.25, 0, 0))
}

/** Tela de streaming com botão play e fileira de pôsteres. */
export function screen(n: number) {
  const out = new Float32Array(n * 3)
  const W = 4.2
  const H = 2.36
  for (let i = 0; i < n; i++) {
    const r = rand()
    let p: [number, number, number]
    if (r < 0.3) {
      const t = rand() * 2 * (W + H)
      let x: number
      let y: number
      if (t < W) [x, y] = [-W / 2 + t, H / 2]
      else if (t < W + H) [x, y] = [W / 2, H / 2 - (t - W)]
      else if (t < 2 * W + H) [x, y] = [W / 2 - (t - W - H), -H / 2]
      else [x, y] = [-W / 2, -H / 2 + (t - 2 * W - H)]
      p = [x + gauss() * 0.015, y + gauss() * 0.015, gauss() * 0.04]
    } else if (r < 0.62) {
      // triângulo do play em relevo
      let a = rand()
      let b = rand()
      if (a + b > 1) [a, b] = [1 - a, 1 - b]
      const v0 = [-0.42, 0.55]
      const v1 = [-0.42, -0.55]
      const v2 = [0.6, 0]
      p = [v0[0] + a * (v1[0] - v0[0]) + b * (v2[0] - v0[0]), 0.1 + v0[1] + a * (v1[1] - v0[1]) + b * (v2[1] - v0[1]), 0.25 + (rand() - 0.5) * 0.25]
    } else if (r < 0.75) {
      const a = rand() * Math.PI * 2
      p = [Math.cos(a) * 0.95, 0.1 + Math.sin(a) * 0.95, 0.2 + gauss() * 0.03]
    } else {
      // pôsteres embaixo
      const k = Math.floor(rand() * 6)
      p = [-W / 2 + 0.22 + k * 0.66 + rand() * 0.5, -H / 2 - 0.35 - rand() * 0.72, gauss() * 0.03]
    }
    out.set(p, i * 3)
  }
  return rotate(center(out, 0, 0.2), new THREE.Euler(0.12, -0.3, 0))
}

/** Pin de localização sobre uma rota (frotas). */
export function pin(n: number) {
  const out = new Float32Array(n * 3)
  const pinPts = [new THREE.Vector2(0, -0.9)]
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI / 2 + 0.7 + (i / 20) * (Math.PI - 0.7) * 1.5
    pinPts.push(new THREE.Vector2(Math.max(0, Math.cos(a) * 0.85), 0.75 + Math.sin(a) * 0.85))
  }
  pinPts.push(new THREE.Vector2(0, 1.6))
  const geo = new THREE.LatheGeometry(pinPts, 28).toNonIndexed()
  const m = new THREE.Matrix4().makeTranslation(0, 0.35, 0)
  fromSampler(geo, n, out, 0, Math.floor(n * 0.55), m)
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.8, -0.9, 0.6),
    new THREE.Vector3(-1.4, -0.7, -0.4),
    new THREE.Vector3(0, -0.6, 0.2),
    new THREE.Vector3(1.3, -0.75, -0.6),
    new THREE.Vector3(2.8, -0.9, 0.3)
  ])
  const q = new THREE.Vector3()
  for (let i = Math.floor(n * 0.55); i < n; i++) {
    const r = rand()
    if (r < 0.75) {
      route.getPoint(rand(), q)
      out.set([q.x + gauss() * 0.03, q.y + gauss() * 0.02, q.z + gauss() * 0.03], i * 3)
    } else {
      // "chão" pontilhado
      out.set([(rand() - 0.5) * 6, -1.0, (rand() - 0.5) * 3], i * 3)
    }
  }
  return rotate(out, new THREE.Euler(0.22, 0.2, 0))
}

/** Dupla hélice: a linha do tempo da carreira, com 4 nós brilhantes. */
export function helix(n: number) {
  const out = new Float32Array(n * 3)
  const L = 4.9
  for (let i = 0; i < n; i++) {
    const r = rand()
    const t = rand()
    const x = -L / 2 + t * L
    const a = t * Math.PI * 5
    if (r < 0.6) {
      const s = rand() < 0.5 ? 0 : Math.PI
      out.set([x, Math.cos(a + s) * 0.6 + gauss() * 0.03, Math.sin(a + s) * 0.6 + gauss() * 0.03], i * 3)
    } else if (r < 0.78) {
      // degraus
      const k = Math.floor(t * 28) / 28
      const aa = k * Math.PI * 5
      const u = rand() * 2 - 1
      out.set([-L / 2 + k * L, Math.cos(aa) * 0.6 * u, Math.sin(aa) * 0.6 * u], i * 3)
    } else {
      // nós (experiências)
      const k = Math.floor(rand() * 4)
      const cx = -L / 2 + (0.14 + k * 0.24) * L
      const rr = Math.abs(gauss()) * 0.28
      const th = rand() * Math.PI * 2
      const ph = Math.acos(2 * rand() - 1)
      out.set([cx + rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)], i * 3)
    }
  }
  return rotate(out, new THREE.Euler(0.2, -0.35, 0.12))
}

/** Nó toroidal: a stack entrelaçada. */
export function knot(n: number) {
  const out = new Float32Array(n * 3)
  fromSampler(new THREE.TorusKnotGeometry(1.3, 0.38, 260, 28, 2, 3).toNonIndexed(), n, out)
  return out
}

function rotate(a: Float32Array, e: THREE.Euler) {
  const m = new THREE.Matrix4().makeRotationFromEuler(e)
  const v = new THREE.Vector3()
  for (let i = 0; i < a.length; i += 3) {
    v.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(m)
    a[i] = v.x
    a[i + 1] = v.y
    a[i + 2] = v.z
  }
  return a
}

function center(a: Float32Array, dx: number, dy: number) {
  for (let i = 0; i < a.length; i += 3) {
    a[i] += dx
    a[i + 1] += dy
  }
  return a
}
