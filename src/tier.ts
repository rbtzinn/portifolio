const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
const small = typeof innerWidth !== 'undefined' && Math.min(innerWidth, innerHeight) < 700
const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4

export const IS_TOUCH = coarse
export const LOW = coarse || small || cores <= 4

export const TIER = {
  low: LOW,
  maxDpr: LOW ? 1.5 : 1.75,
  bloom: !LOW,
  waterSegments: LOW ? 90 : 180,
  yardDensity: LOW ? 0.55 : 1,
  stars: LOW ? 900 : 2200
}

export const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
