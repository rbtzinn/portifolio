/**
 * Componentes de interface inspirados em Cult UI / Skiper UI, recriados em TS puro
 * (sem React) para manter o site leve: janelas de navegador e celular com tilt 3D,
 * terminal que digita sozinho, números em odômetro, dock com ampliação,
 * "dynamic island", texto que se decodifica e reveal de palavras na rolagem.
 */
import type { Project } from './data'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// ————————————————————————————————————————— dispositivos
export function deviceMarkup(p: Project) {
  if (p.device === 'phone')
    return `
      <a class="device phone tilt beam-hover" href="${p.link}" target="_blank" rel="noopener" aria-label="Abrir ${esc(p.name)}">
        <span class="notch"></span>
        <span class="screen"><img src="${p.shot}" alt="Tela do ${esc(p.name)}" loading="lazy" decoding="async" /></span>
        <span class="glare"></span>
      </a>`
  if (p.device === 'terminal')
    return `
      <div class="device term tilt" data-terminal='${JSON.stringify(p.terminal ?? []).replace(/'/g, '&#39;')}'>
        <div class="bar"><i></i><i></i><i></i><span class="url">${esc(p.url)}</span></div>
        <pre class="term-body" aria-live="off"></pre>
        <span class="glare"></span>
      </div>`
  return `
    <a class="device browser tilt beam-hover" href="${p.link}" target="_blank" rel="noopener" aria-label="Abrir ${esc(p.name)}">
      <span class="bar"><i></i><i></i><i></i><span class="url"><b>●</b> ${esc(p.url)}</span></span>
      <span class="screen"><img src="${p.shot}" alt="Página inicial do ${esc(p.name)}" loading="lazy" decoding="async" /></span>
      <span class="device-cta">Abrir site ↗</span>
      <span class="glare"></span>
    </a>`
}

/** Tilt 3D + reflexo que segue o cursor. */
export function setupTilt() {
  document.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`)
      el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`)
      el.style.setProperty('--gx', `${x * 100}%`)
      el.style.setProperty('--gy', `${y * 100}%`)
      el.classList.add('tilting')
    })
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--rx')
      el.style.removeProperty('--ry')
      el.classList.remove('tilting')
    })
  })
}

// ————————————————————————————————————————— terminal
export type TermLine = { t: 'cmd' | 'out' | 'ok' | 'dim' | 'hl'; s: string }

/** Terminal que digita os comandos e "imprime" as saídas, uma vez por elemento. */
export function playTerminal(root: HTMLElement | null, lines?: TermLine[], speed = 1) {
  if (!root || root.dataset.played) return
  const body = root.querySelector<HTMLElement>('.term-body')
  if (!body) return
  root.dataset.played = '1'
  lines ??= JSON.parse(root.dataset.terminal || '[]') as TermLine[]
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const cursor = '<span class="caret"></span>'
  let html = ''
  let i = 0
  const next = () => {
    if (i >= lines!.length) {
      body.innerHTML = html + `<span class="prompt">$</span> ${cursor}`
      return
    }
    const l = lines![i++]
    if (l.t === 'cmd' && !reduce) {
      let k = 0
      const type = () => {
        k++
        body.innerHTML = html + `<span class="prompt">$</span> ${esc(l.s.slice(0, k))}${cursor}`
        if (k < l.s.length) setTimeout(type, (18 + Math.random() * 40) / speed)
        else {
          html += `<span class="prompt">$</span> ${esc(l.s)}\n`
          setTimeout(next, 260 / speed)
        }
      }
      type()
    } else {
      html += l.t === 'cmd' ? `<span class="prompt">$</span> ${esc(l.s)}\n` : `<span class="${l.t}">${esc(l.s)}</span>\n`
      body.innerHTML = html + cursor
      setTimeout(next, reduce ? 0 : (l.t === 'ok' ? 320 : 140) / speed)
    }
  }
  next()
}

// ————————————————————————————————————————— odômetro
export function setupOdometers() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const digits = String(el.dataset.count).split('')
    el.setAttribute('aria-label', String(el.dataset.count))
    // o "sizer" invisível dá a cada casa a largura exata do dígito final
    el.innerHTML = digits
      .map(
        (d) =>
          `<span class="odo"><span class="odo-sizer">${d}</span><span class="odo-strip">${'0123456789'.split('').map((n) => `<i>${n}</i>`).join('')}</span></span>`
      )
      .join('')
  })
}
export function rollOdometers() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const digits = String(el.dataset.count).split('')
    el.querySelectorAll<HTMLElement>('.odo-strip').forEach((s, i) => {
      s.style.transitionDelay = `${i * 120 + Math.random() * 120}ms`
      // dá voltas extras antes de parar, como um odômetro
      s.style.transform = `translateY(-${Number(digits[i]) * 10}%)`
    })
    el.classList.add('rolled')
  })
}

// ————————————————————————————————————————— dock (contato)
export function setupDock() {
  const dock = document.querySelector<HTMLElement>('.dock')
  if (!dock) return
  const items = [...dock.querySelectorAll<HTMLElement>('.dock-item')]
  const reset = () => items.forEach((it) => it.style.setProperty('--s', '1'))
  dock.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    for (const it of items) {
      const r = it.getBoundingClientRect()
      const d = Math.abs(e.clientX - (r.left + r.width / 2))
      it.style.setProperty('--s', String(1 + 0.65 * Math.max(0, 1 - d / 130)))
    }
  })
  dock.addEventListener('pointerleave', reset)
  reset()
}

// ————————————————————————————————————————— dynamic island
export function createIsland() {
  const el = document.querySelector<HTMLElement>('#island')!
  const label = el.querySelector<HTMLElement>('.island-label')!
  let resting = ''
  let timer = 0
  const set = (text: string) => {
    // mede o texto para animar a largura
    const probe = label.cloneNode() as HTMLElement
    probe.textContent = text
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
    el.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    probe.remove()
    el.style.setProperty('--w', `${Math.ceil(w) + 44}px`)
    label.classList.remove('in')
    void label.offsetWidth
    label.classList.add('in')
    scramble(label, text)
  }
  return {
    chapter(text: string) {
      resting = text
      if (!el.classList.contains('alert')) set(text)
    },
    flash(text: string, ms = 2400) {
      clearTimeout(timer)
      el.classList.add('alert')
      set(text)
      timer = window.setTimeout(() => {
        el.classList.remove('alert')
        set(resting)
      }, ms)
    }
  }
}

// ————————————————————————————————————————— texto que se decodifica
const GLYPHS = '!<>-_\\/[]{}—=+*^?#01'
const scrambleRaf = new WeakMap<HTMLElement, number>()
export function scramble(el: HTMLElement | null, target = el?.textContent ?? '') {
  if (!el) return
  cancelAnimationFrame(scrambleRaf.get(el) ?? 0)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = target
    return
  }
  let frame = 0
  const total = 22
  const tick = () => {
    frame++
    el.textContent = target
      .split('')
      .map((c, i) => (c === ' ' || frame / total > i / target.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
      .join('')
    if (frame < total) scrambleRaf.set(el, requestAnimationFrame(tick))
    else el.textContent = target
  }
  tick()
}

// ————————————————————————————————————————— reveal horizontal de palavras (estilo Skiper72)
export function createWordReveal() {
  const root = document.querySelector<HTMLElement>('#reveal')!
  const words = [...root.querySelectorAll<HTMLElement>('.w')]
  let last = -1
  return (p: number) => {
    // p: 0 → entrando, 0.5 → frase completa, 1 → saindo
    const q = Math.round(p * 400) / 400
    if (q === last) return
    last = q
    root.style.visibility = q > 0 && q < 1 ? 'visible' : 'hidden'
    const n = words.length
    words.forEach((w, i) => {
      const a = Math.min(1, Math.max(0, (q * 2.2 * n - i * 1.05) / 2.2)) // entrada
      const b = Math.min(1, Math.max(0, ((q - 0.62) * 2.6 * n - i * 0.8) / 2)) // saída
      const x = (1 - a) * 140 - b * 160
      w.style.opacity = String(a * (1 - b))
      w.style.transform = `translate3d(${x}px,0,0) skewX(${(1 - a) * -18 + b * 14}deg)`
      w.style.filter = a < 1 || b > 0 ? `blur(${(1 - a) * 10 + b * 8}px)` : 'none'
    })
  }
}
