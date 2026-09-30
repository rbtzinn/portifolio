import { LOGBOOK, PROJECTS, STACK, PROFILE, type Project } from './data'

const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T

function el(tag: string, cls?: string, html?: string) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function buildChapters() {
  // capítulos de projeto (um por contêiner)
  const host = $('#project-chapters')
  PROJECTS.forEach((p, i) => {
    const s = el('section', 'chapter side-left project')
    s.id = `carga-${i + 1}`
    s.dataset.stop = String(2 + i)
    s.dataset.name = p.short
    s.innerHTML = `
      <div class="card">
        <div class="kicker r" style="--k:.2">02 · Projetos <span class="proj-index">${String(i + 1).padStart(2, '0')}/05</span></div>
        <h2 class="r" style="--k:.4">${esc(p.name)}</h2>
        <div class="proj-meta r" style="--k:.55"><b>${esc(p.kind)}</b><span>${esc(p.year)}</span></div>
        <p class="proj-summary r" style="--k:.7">${esc(p.summary)}</p>
        <div class="chips r" style="--k:.85">${p.stack.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="actions r" style="--k:1">
          <a class="btn primary" href="${p.link}" target="_blank" rel="noopener" data-magnetic>${esc(p.linkLabel)} ↗</a>
          <button class="btn" data-manifest="${i}" data-magnetic>Ver detalhes</button>
        </div>
      </div>`
    host.appendChild(s)
  })

  const log = $('#log')
  LOGBOOK.forEach((e, i) => {
    const li = el('li', 'r')
    li.style.setProperty('--k', String(0.55 + i * 0.15))
    li.innerHTML = `<span class="buoy"></span><span class="when">${esc(e.when)}</span><span class="role">${esc(e.role)}</span><span class="org">${esc(e.org)}</span><span class="note">${esc(e.note)}</span>`
    log.appendChild(li)
  })

  const stack = $('#stack')
  STACK.forEach((g, i) => {
    const d = el('div', 'grp r')
    d.style.setProperty('--k', String(0.55 + i * 0.12))
    d.innerHTML = `<span class="grp-name">${esc(g.group)}</span><div class="chips">${g.items.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`
    stack.appendChild(d)
  })

  $('#year').textContent = String(new Date().getFullYear())

  // letras do título
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((w, wi) => {
    const text = w.textContent ?? ''
    w.setAttribute('aria-label', text)
    w.innerHTML = [...text].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i + wi * 4}">${c}</span>`).join('')
  })

  const chapters = [...document.querySelectorAll<HTMLElement>('.chapter')].sort(
    (a, b) => Number(a.dataset.stop) - Number(b.dataset.stop)
  )

  // trilho de navegação
  const rail = $('#rail')
  const railItems = chapters.map((c) => {
    const li = el('li')
    const b = el('button', '', `<span class="t">${esc(c.dataset.name ?? '')}</span><span class="bar"></span>`)
    b.dataset.go = c.dataset.stop
    b.setAttribute('aria-label', c.dataset.name ?? '')
    li.appendChild(b)
    rail.appendChild(li)
    return li
  })

  return { chapters, railItems }
}

export function createManifest(onOpen: (i: number) => void, onClose: () => void) {
  const root = $('#manifest')
  let open = false
  let last: HTMLElement | null = null
  const fill = (p: Project) => {
    $('#mf-code').textContent = `Projeto ${String(PROJECTS.indexOf(p) + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`
    $('#mf-name').textContent = p.name
    $('#mf-kind').textContent = `${p.kind} · ${p.year}`
    $('#mf-summary').textContent = p.summary
    $('#mf-bullets').innerHTML = p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')
    $('#mf-stack').innerHTML = p.stack.map((t) => `<span>${esc(t)}</span>`).join('')
    const a = $<HTMLAnchorElement>('#mf-link')
    a.href = p.link
    a.textContent = `${p.linkLabel} ↗`
  }
  const show = (i: number) => {
    last = document.activeElement as HTMLElement
    fill(PROJECTS[i])
    root.hidden = false
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')))
    open = true
    onOpen(i)
    setTimeout(() => $<HTMLButtonElement>('.manifest-close').focus({ preventScroll: true }), 50)
  }
  const hide = () => {
    if (!open) return
    root.classList.remove('open')
    open = false
    onClose()
    setTimeout(() => {
      if (!open) root.hidden = true
    }, 700)
    last?.focus({ preventScroll: true })
  }
  root.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-close]')) hide()
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide()
  })
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-manifest]')
    if (b) show(Number(b.dataset.manifest))
  })
  return { show, hide, isOpen: () => open }
}

export function toast(msg: string) {
  const t = $('#toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout((t as HTMLElement & { _t?: number })._t)
  ;(t as HTMLElement & { _t?: number })._t = window.setTimeout(() => t.classList.remove('show'), 2200)
}

export function setupCopyEmail(onCopy: () => void) {
  $('#copy-email').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email)
      toast('E-mail copiado. Estou no aguardo! ✦')
    } catch {
      location.href = `mailto:${PROFILE.email}`
    }
    onCopy()
  })
}

/** Botões "magnéticos" que seguem levemente o cursor. */
export function setupMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = b.getBoundingClientRect()
      const x = e.clientX - r.left - r.width / 2
      const y = e.clientY - r.top - r.height / 2
      b.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`
    })
    b.addEventListener('pointerleave', () => {
      b.style.transform = ''
    })
  })
}

export function noiseDataUrl() {
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(160, 160)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}
