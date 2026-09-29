import * as THREE from 'three'
import { LAMP_XS, LAMP_Z, QUAY_X, QUAY_Z } from './layout'
import type { Project } from '../data'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Piso do cais com as poças de luz de sódio já "assadas". */
export function quayTexture() {
  const W = 1024
  const H = 1024
  const { c, ctx } = canvas(W, H)
  const [x0, x1] = QUAY_X
  const [z0, z1] = QUAY_Z
  const toU = (x: number) => ((x - x0) / (x1 - x0)) * W
  const toV = (z: number) => ((z - z0) / (z1 - z0)) * H

  ctx.fillStyle = '#17181c'
  ctx.fillRect(0, 0, W, H)
  // placas de concreto
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 24) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  // faixas amarelas de segurança perto da borda
  ctx.fillStyle = 'rgba(230,170,40,0.55)'
  ctx.fillRect(0, toV(-11.5), W, 3)
  ctx.fillRect(0, toV(-21.5), W, 2)
  // luz das luminárias
  ctx.globalCompositeOperation = 'lighter'
  const pools: [number, number, number][] = LAMP_XS.map((x) => [x, LAMP_Z, 1])
  for (let x = -70; x <= 60; x += 16) for (let z = -40; z >= -120; z -= 22) pools.push([x, z, 0.6])
  for (const [x, z, k] of pools) {
    const g = ctx.createRadialGradient(toU(x), toV(z), 0, toU(x), toV(z), 90)
    g.addColorStop(0, `rgba(255,150,70,${0.55 * k})`)
    g.addColorStop(0.4, `rgba(200,100,40,${0.2 * k})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.globalCompositeOperation = 'source-over'
  // ruído
  const img = ctx.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  return tex(c)
}

export function lighthouseTexture() {
  const { c, ctx } = canvas(64, 512)
  const bands = 7
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? '#e9e4da' : '#b8262b'
    ctx.fillRect(0, (i * 512) / bands, 64, 512 / bands + 1)
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`
    ctx.fillRect(Math.random() * 64, Math.random() * 512, 2, 4 + Math.random() * 14)
  }
  return tex(c)
}

/** Lateral do contêiner de projeto: código ISO, nome e marcações de carga. */
export function containerLabel(p: Project, index: number) {
  const { c, ctx } = canvas(1024, 440)
  const g = ctx.createLinearGradient(0, 0, 0, 440)
  g.addColorStop(0, p.color)
  g.addColorStop(1, shade(p.color, -0.35))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 440)
  // corrugação
  for (let x = 0; x < 1024; x += 2) {
    const s = Math.sin((x / 1024) * Math.PI * 2 * 30)
    ctx.fillStyle = s > 0 ? `rgba(255,255,255,${s * 0.07})` : `rgba(0,0,0,${-s * 0.18})`
    ctx.fillRect(x, 0, 2, 440)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, 0, 1024, 16)
  ctx.fillRect(0, 424, 1024, 16)
  ctx.fillStyle = '#f3efe6'
  ctx.font = '600 44px "JetBrains Mono", monospace'
  ctx.fillText(p.code, 48, 86)
  ctx.font = '500 22px "JetBrains Mono", monospace'
  ctx.globalAlpha = 0.75
  ctx.fillText(`MAX GROSS 30.480 KG · 22G1 · CARGA ${String(index + 1).padStart(2, '0')}/05`, 48, 124)
  ctx.globalAlpha = 1
  ctx.font = '800 76px "Syne", sans-serif'
  wrap(ctx, p.name.toUpperCase(), 48, 250, 900, 78)
  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.fillStyle = p.accent
  ctx.fillText(`${p.kind.toUpperCase()} · ${p.year.toUpperCase()}`, 48, 392)
  // selo RFID
  ctx.strokeStyle = p.accent
  ctx.lineWidth = 4
  ctx.strokeRect(880, 40, 100, 100)
  ctx.font = '700 22px "JetBrains Mono", monospace'
  ctx.fillText('RFID', 902, 98)
  return tex(c)
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  const lines: string[] = []
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > max && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  lines.push(line)
  const start = y - ((lines.length - 1) * lh) / 2
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, start + i * lh))
}

export function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt * hsl.l)))
  return '#' + c.getHexString()
}

export function glowTexture() {
  const { c, ctx } = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.6)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return tex(c, false)
}

// ————————————————————————————————————————— mapas PBR procedurais (realismo)

function normalFromHeight(h: Float32Array, w: number, hgt: number, strength: number, wrapX = true) {
  const { c, ctx } = canvas(w, hgt)
  const img = ctx.createImageData(w, hgt)
  const at = (x: number, y: number) => {
    x = wrapX ? (x + w) % w : Math.max(0, Math.min(w - 1, x))
    y = Math.max(0, Math.min(hgt - 1, y))
    return h[y * w + x]
  }
  for (let y = 0; y < hgt; y++)
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const l = Math.hypot(dx, dy, 1)
      const i = (y * w + x) * 4
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255
      img.data[i + 2] = (1 / l) * 255
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Chapa de contêiner realista: corrugação trapezoidal, ferrugem escorrida, sujeira e desgaste. */
export function containerMaps() {
  const W = 512
  const H = 256
  const ribs = 18
  const height = new Float32Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = ((x / W) * ribs) % 1
      // perfil trapezoidal
      let v = p < 0.12 ? p / 0.12 : p < 0.45 ? 1 : p < 0.57 ? 1 - (p - 0.45) / 0.12 : 0
      if (y < 10 || y > H - 12) v = 0.5 // trilhos
      height[y * W + x] = v + (Math.random() - 0.5) * 0.03
    }
  const normalMap = normalFromHeight(height, W, H, 3.2)

  // cor (multiplicada pela cor da instância)
  const col = canvas(W, H)
  const cx = col.ctx
  cx.fillStyle = '#d8d8d8'
  cx.fillRect(0, 0, W, H)
  for (let i = 0; i < 40; i++) {
    cx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`
    cx.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 160, 20 + Math.random() * 120)
  }
  // ferrugem escorrendo do trilho superior (e mais rugosa)
  const rough = canvas(W, H)
  const rx = rough.ctx
  rx.fillStyle = 'rgb(0,150,0)'
  rx.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W
    const len = 20 + Math.random() * Math.random() * 200
    const wdt = 1 + Math.random() * 4
    const g = cx.createLinearGradient(0, 8, 0, 8 + len)
    const a = 0.25 + Math.random() * 0.45
    g.addColorStop(0, `rgba(96,48,22,${a})`)
    g.addColorStop(1, 'rgba(96,48,22,0)')
    cx.fillStyle = g
    cx.fillRect(x, 8, wdt, len)
    rx.fillStyle = `rgba(0,235,0,${a})`
    rx.fillRect(x, 8, wdt, len * 0.6)
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const r = 3 + Math.random() * 14
    const g = cx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(80,38,18,0.7)')
    g.addColorStop(1, 'rgba(80,38,18,0)')
    cx.fillStyle = g
    cx.fillRect(x - r, y - r, r * 2, r * 2)
    rx.fillStyle = 'rgba(0,240,0,0.6)'
    rx.beginPath()
    rx.arc(x, y, r * 0.6, 0, Math.PI * 2)
    rx.fill()
  }
  // sujeira acumulada embaixo
  const dirt = cx.createLinearGradient(0, H * 0.6, 0, H)
  dirt.addColorStop(0, 'rgba(40,32,24,0)')
  dirt.addColorStop(1, 'rgba(40,32,24,0.55)')
  cx.fillStyle = dirt
  cx.fillRect(0, 0, W, H)
  cx.fillStyle = 'rgba(0,0,0,0.45)'
  cx.fillRect(0, 0, W, 10)
  cx.fillRect(0, H - 12, W, 12)

  const map = tex(col.c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  const roughnessMap = new THREE.CanvasTexture(rough.c)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  return { map, normalMap, roughnessMap }
}

/** Portas do contêiner (pontas): duas folhas com barras de travamento. */
export function containerDoorMaps() {
  const W = 256
  const H = 256
  const height = new Float32Array(W * H)
  const col = canvas(W, H)
  const cx = col.ctx
  cx.fillStyle = '#cfcfcf'
  cx.fillRect(0, 0, W, H)
  const bars = [34, 94, 162, 222]
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0.5
      const inX = x % 128
      if (inX < 6 || inX > 122 || y < 8 || y > H - 8) v = 0.2
      const p = ((inX / 128) * 5) % 1
      if (inX > 10 && inX < 118 && y > 14 && y < H - 14) v = p < 0.5 ? 0.62 : 0.5
      for (const bx of bars) if (Math.abs(x - bx) < 3) v = 0.95
      height[y * W + x] = v
    }
  for (const bx of bars) {
    cx.fillStyle = '#9a9a9a'
    cx.fillRect(bx - 3, 6, 6, H - 12)
    cx.fillStyle = '#6d6d6d'
    cx.fillRect(bx - 7, H / 2 - 8, 14, 16)
  }
  cx.fillStyle = 'rgba(0,0,0,0.6)'
  cx.fillRect(126, 0, 4, H)
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * W
    const g = cx.createLinearGradient(0, 0, 0, 120)
    g.addColorStop(0, 'rgba(96,48,22,0.5)')
    g.addColorStop(1, 'rgba(96,48,22,0)')
    cx.fillStyle = g
    cx.fillRect(x, 0, 2, 40 + Math.random() * 100)
  }
  return { map: tex(col.c), normalMap: normalFromHeight(height, W, H, 4, false) }
}

/** Concreto molhado: poças quase espelhadas (baixa rugosidade) e juntas de dilatação. */
export function quayPBR() {
  const W = 512
  const rough = canvas(W, W)
  const rx = rough.ctx
  rx.fillStyle = 'rgb(0,215,0)'
  rx.fillRect(0, 0, W, W)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * W
    const y = Math.random() * W
    const r = 8 + Math.random() * 46
    const g = rx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(0,25,0,0.95)')
    g.addColorStop(0.7, 'rgba(0,60,0,0.6)')
    g.addColorStop(1, 'rgba(0,215,0,0)')
    rx.fillStyle = g
    rx.beginPath()
    rx.ellipse(x, y, r * (1 + Math.random()), r * 0.6, Math.random() * 3, 0, Math.PI * 2)
    rx.fill()
  }
  const roughnessMap = new THREE.CanvasTexture(rough.c)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  const height = new Float32Array(W * W)
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      let v = Math.random() * 0.25
      if (x % 128 < 2 || y % 128 < 2) v = -0.6
      height[y * W + x] = v
    }
  const normalMap = normalFromHeight(height, W, W, 1.2)
  return { roughnessMap, normalMap }
}
