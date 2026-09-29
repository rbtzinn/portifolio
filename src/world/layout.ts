import * as THREE from 'three'

// Geografia do porto (unidades ≈ metros)
export const QUAY_EDGE_Z = -8
export const QUAY_TOP = 1.6
export const QUAY_X: [number, number] = [-84, 72]
export const QUAY_Z: [number, number] = [-140, QUAY_EDGE_Z]

export const LAMP_XS: number[] = []
for (let x = -78; x <= 66; x += 12) LAMP_XS.push(x)
export const LAMP_Z = QUAY_EDGE_Z - 1.2
export const LAMP_H = 11

export const PROJECT_SLOTS = [0, 9, 18, 27, 36].map((x) => new THREE.Vector3(x, QUAY_TOP, -16))
export const LIFT_HEIGHT = 5.2

export const BADGE_POS = new THREE.Vector3(-36, 5.6, -2.5)

export const BUOYS = [
  new THREE.Vector3(66, 0, 22),
  new THREE.Vector3(84, 0, 34),
  new THREE.Vector3(103, 0, 28),
  new THREE.Vector3(121, 0, 38)
]

// Píer de madeira que sai do cais em direção ao mar (onde o avatar fica na chegada)
export const PIER_X = 6
export const PIER_W = 2.6
export const PIER_Z1 = 76
export const PIER_TOP = 1.25
export const PIER_LAMP_ZS = [70, 56, 42, 28, 14, 0]
export const PIER_LAMP_X = PIER_X + PIER_W / 2 - 0.15

// todas as luzes que refletem na água (x, z)
export const WATER_LAMPS = [
  ...LAMP_XS.map((x) => new THREE.Vector2(x, LAMP_Z)),
  ...PIER_LAMP_ZS.map((z) => new THREE.Vector2(PIER_LAMP_X, z))
]

export const AVATAR_SIT = new THREE.Vector3(PIER_X - 0.25, PIER_TOP, PIER_Z1 - 0.28)
export const AVATAR_STAND = new THREE.Vector3(126.9, 3.1, 33.4)

export const LIGHTHOUSE = new THREE.Vector3(152, 0, -12)
export const LIGHTHOUSE_H = 27
export const LANTERN = new THREE.Vector3(LIGHTHOUSE.x, LIGHTHOUSE_H + 2.2, LIGHTHOUSE.z)
