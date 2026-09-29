// Som ambiente 100% sintetizado (sem arquivos): mar, drone grave, bipes do leitor e buzina do farol.
export class Ambience {
  ctx?: AudioContext
  master?: GainNode
  on = false

  private ensure() {
    if (this.ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    this.ctx = ctx
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    this.master = master

    // mar: ruído marrom filtrado com LFO lento
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.2
      }
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    const sea = ctx.createGain()
    sea.gain.value = 0.55
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 320
    lfo.connect(lfoGain).connect(lp.frequency)
    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.13
    const lfo2g = ctx.createGain()
    lfo2g.gain.value = 0.25
    lfo2.connect(lfo2g).connect(sea.gain)
    noise.connect(lp).connect(sea).connect(master)
    noise.start()
    lfo.start()
    lfo2.start()

    // drone
    for (const [f, g] of [
      [55, 0.05],
      [82.4, 0.03],
      [110.2, 0.012]
    ]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og).connect(master)
      o.start()
    }
  }

  toggle() {
    this.ensure()
    const ctx = this.ctx!
    if (ctx.state === 'suspended') ctx.resume()
    this.on = !this.on
    this.master!.gain.cancelScheduledValues(ctx.currentTime)
    this.master!.gain.setTargetAtTime(this.on ? 0.5 : 0, ctx.currentTime, 0.4)
    return this.on
  }

  blip(freq = 1320, dur = 0.07, vol = 0.12) {
    if (!this.on || !this.ctx) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 3000
    o.connect(f).connect(g).connect(this.master!)
    o.start()
    o.stop(ctx.currentTime + dur + 0.02)
  }

  whoosh() {
    if (!this.on || !this.ctx) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(180, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
    o.connect(g).connect(this.master!)
    o.start()
    o.stop(ctx.currentTime + 0.8)
  }

  horn() {
    if (!this.on || !this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.35)
    g.gain.setValueAtTime(0.18, t + 1.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 420
    f.connect(g).connect(this.master!)
    for (const fr of [73.4, 110]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = fr
      o.connect(f)
      o.start(t)
      o.stop(t + 3)
    }
  }
}
