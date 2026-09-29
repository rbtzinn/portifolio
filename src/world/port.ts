import * as THREE from 'three'
import { TIER } from '../tier'
import { PROJECTS } from '../data'
import {
  LAMP_H,
  LAMP_XS,
  LAMP_Z,
  LIFT_HEIGHT,
  LIGHTHOUSE,
  PROJECT_SLOTS,
  QUAY_EDGE_Z,
  QUAY_TOP,
  QUAY_X,
  QUAY_Z,
  BADGE_POS
} from './layout'
import { containerDoorMaps, containerLabel, containerMaps, glowTexture, quayPBR, quayTexture } from './textures'

const CONT = new THREE.Vector3(6.06, 2.59, 2.44)
const PALETTE = ['#7d2a22', '#2c4f7c', '#3c6b4f', '#8a6a2b', '#5a5d63', '#8c3b1c', '#264a4a', '#6b2d4d', '#9aa0a6', '#b0612a']

export type ProjectContainer = {
  mesh: THREE.Mesh
  base: THREE.Vector3
  index: number
  lift: number // 0..1 animado
  target: number
}

export type Blinker = { mesh: THREE.Object3D; phase: number; rate: number }

export function createPort() {
  const group = new THREE.Group()
  const blinkers: Blinker[] = []
  const glowPositions: number[] = []
  const glowColors: number[] = []
  const glowSizes: number[] = []
  const addGlow = (p: THREE.Vector3, color: THREE.ColorRepresentation, size: number) => {
    const c = new THREE.Color(color)
    glowPositions.push(p.x, p.y, p.z)
    glowColors.push(c.r, c.g, c.b)
    glowSizes.push(size)
  }

  // ——— Cais
  const [x0, x1] = QUAY_X
  const [z0, z1] = QUAY_Z
  const quayGeo = new THREE.BoxGeometry(x1 - x0, QUAY_TOP + 4, z1 - z0)
  // concreto molhado: poças refletem as luminárias e o céu via environment map
  const wet = quayPBR()
  wet.roughnessMap.repeat.set(9, 8)
  wet.normalMap.repeat.set(9, 8)
  const top = new THREE.MeshStandardMaterial({
    map: quayTexture(),
    roughness: 1,
    roughnessMap: wet.roughnessMap,
    normalMap: wet.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    metalness: 0,
    envMapIntensity: 1.6
  })
  const side = new THREE.MeshStandardMaterial({ color: '#23252b', roughness: 1 })
  const quay = new THREE.Mesh(quayGeo, [side, side, top, side, side, side])
  quay.position.set((x0 + x1) / 2, (QUAY_TOP - 4) / 2, (z0 + z1) / 2)
  quay.receiveShadow = true
  group.add(quay)

  // defensas pretas na borda do cais
  const fenderGeo = new THREE.BoxGeometry(0.8, 1.6, 0.6)
  const fenderMat = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.8 })
  const fenders = new THREE.InstancedMesh(fenderGeo, fenderMat, Math.floor((x1 - x0) / 6))
  const m4 = new THREE.Matrix4()
  for (let i = 0; i < fenders.count; i++) {
    m4.makeTranslation(x0 + 3 + i * 6, 0.4, QUAY_EDGE_Z + 0.3)
    fenders.setMatrixAt(i, m4)
  }
  group.add(fenders)

  // ——— Pátio de contêineres (instanciado)
  const cm = containerMaps()
  const dm = containerDoorMaps()
  const contSide = new THREE.MeshStandardMaterial({
    map: cm.map,
    normalMap: cm.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: cm.roughnessMap,
    roughness: 1,
    metalness: 0.45
  })
  const contDoor = new THREE.MeshStandardMaterial({ map: dm.map, normalMap: dm.normalMap, roughness: 0.7, metalness: 0.45 })
  const contMat = [contDoor, contDoor, contSide, contSide, contSide, contSide]
  const slots: { p: THREE.Vector3; rot: number; color: string }[] = []
  const rand = mulberry(7)
  for (let row = 0; row < 9; row++) {
    const z = -24 - row * 3.2 - Math.floor(row / 3) * 4.5
    for (let x = -72; x < 60; x += 6.6) {
      if (Math.abs(x - BADGE_POS.x) < 9 && row < 1) continue
      if (rand() > 0.82 * TIER.yardDensity + (TIER.low ? 0.1 : 0)) continue
      const h = 1 + Math.floor(rand() * rand() * 5)
      for (let k = 0; k < h; k++)
        slots.push({
          p: new THREE.Vector3(x, QUAY_TOP + CONT.y / 2 + k * CONT.y, z),
          rot: 0,
          color: PALETTE[Math.floor(rand() * PALETTE.length)]
        })
    }
  }
  // fundos mais distantes: blocos altos compondo o skyline
  for (let i = 0; i < 26; i++) {
    const x = -80 + rand() * 150
    const z = -90 - rand() * 40
    const h = 2 + Math.floor(rand() * 4)
    for (let k = 0; k < h; k++)
      slots.push({ p: new THREE.Vector3(x, QUAY_TOP + CONT.y / 2 + k * CONT.y, z), rot: Math.PI / 2, color: PALETTE[Math.floor(rand() * PALETTE.length)] })
  }
  const yard = new THREE.InstancedMesh(new THREE.BoxGeometry(CONT.x, CONT.y, CONT.z), contMat, slots.length)
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3(1, 1, 1)
  slots.forEach((s, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot)
    m4.compose(s.p, q, sc)
    yard.setMatrixAt(i, m4)
    yard.setColorAt(i, new THREE.Color(s.color))
  })
  yard.castShadow = yard.receiveShadow = true
  group.add(yard)

  // ——— Contêineres dos projetos (primeira fila, rotulados)
  const projects: ProjectContainer[] = PROJECTS.map((p, i) => {
    const label = containerLabel(p, i)
    const body = contSide.clone()
    body.color.set(p.color)
    const face = new THREE.MeshStandardMaterial({
      map: label,
      normalMap: cm.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: cm.roughnessMap,
      roughness: 0.9,
      metalness: 0.35,
      emissive: new THREE.Color(p.accent),
      emissiveIntensity: 0,
      emissiveMap: label
    })
    const ends = contDoor.clone()
    ends.color.set(p.color)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(CONT.x, CONT.y, CONT.z), [ends, ends, body, body, face, face])
    const base = PROJECT_SLOTS[i].clone().add(new THREE.Vector3(0, CONT.y / 2, 0))
    mesh.position.copy(base)
    mesh.userData.projectIndex = i
    mesh.castShadow = mesh.receiveShadow = true
    // arestas luminosas
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CONT.x + 0.04, CONT.y + 0.04, CONT.z + 0.04)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(p.accent).multiplyScalar(3), transparent: true, opacity: 0 })
    )
    mesh.add(edges)
    mesh.userData.edges = edges
    mesh.userData.face = face
    group.add(mesh)
    return { mesh, base, index: i, lift: 0, target: 0 }
  })

  // ——— Pórtico (RMG) que corre sobre os contêineres dos projetos
  const steel = new THREE.MeshStandardMaterial({ color: '#d9a12b', roughness: 0.55, metalness: 0.5 })
  const dark = new THREE.MeshStandardMaterial({ color: '#1a1b1f', roughness: 0.7, metalness: 0.4 })
  const gantry = new THREE.Group()
  const legH = 15
  const span = 12
  for (const dz of [-span / 2, span / 2]) {
    for (const dx of [-4.6, 4.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, legH, 0.7), steel)
      leg.position.set(dx, legH / 2, dz)
      gantry.add(leg)
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.6, 1), dark)
    sill.position.set(0, 0.3, dz)
    gantry.add(sill)
  }
  for (const dx of [-4.6, 4.6]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, span + 3), steel)
    beam.position.set(dx, legH, 0)
    gantry.add(beam)
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), dark)
  cab.position.set(5.4, legH - 2, -span / 2 + 1)
  gantry.add(cab)
  const cabGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(2.5) }))
  cabGlow.position.set(5.4, legH - 1.9, -span / 2 + 1.81)
  gantry.add(cabGlow)
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 2.4), dark)
  trolley.position.set(0, legH + 1.1, 0)
  gantry.add(trolley)
  const cableMat = new THREE.MeshBasicMaterial({ color: '#0d0d0f' })
  const cables: THREE.Mesh[] = []
  for (const dx of [-2.4, 2.4]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), cableMat)
    c.position.x = dx
    gantry.add(c)
    cables.push(c)
  }
  const spreader = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.35, 2.5), steel)
  gantry.add(spreader)
  const warn = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(4) }))
  warn.position.set(0, legH + 1.9, 0)
  gantry.add(warn)
  blinkers.push({ mesh: warn, phase: 0, rate: 3.2 })
  gantry.position.set(PROJECT_SLOTS[0].x, QUAY_TOP, PROJECT_SLOTS[0].z - 1)
  group.add(gantry)

  // Holofote do pórtico
  const spot = new THREE.SpotLight('#ffd6a8', 380, 40, 0.5, 0.6, 1.6)
  spot.position.set(0, legH - 0.5, 0)
  if (!TIER.low) {
    spot.castShadow = true
    spot.shadow.mapSize.set(1024, 1024)
    spot.shadow.camera.near = 2
    spot.shadow.camera.far = 30
    spot.shadow.bias = -0.0008
    spot.shadow.radius = 4
    gantry.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
  }
  gantry.add(spot)
  gantry.add(spot.target)

  // ——— Guindastes STS no cais (silhuetas altas, com luz de balizamento)
  const stsXs = [-66, 46, 62]
  for (const x of stsXs) {
    const g = createSTS(steel, dark)
    g.position.set(x, QUAY_TOP, QUAY_EDGE_Z - 6)
    group.add(g)
    const top = new THREE.Vector3(x, QUAY_TOP + 38.5, QUAY_EDGE_Z - 6)
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2020').multiplyScalar(5) }))
    bl.position.copy(top)
    group.add(bl)
    blinkers.push({ mesh: bl, phase: x * 0.13, rate: 1.1 })
    addGlow(new THREE.Vector3(x, QUAY_TOP + 24, QUAY_EDGE_Z + 12), '#ffb070', 2.2)
  }

  // ——— Luminárias
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, LAMP_H, 6)
  const poles = new THREE.InstancedMesh(poleGeo, dark, LAMP_XS.length + 20)
  let pi = 0
  const lampHeads: THREE.Vector3[] = []
  // na frente do pátio de projetos os postes viram balizadores baixos, para não bloquear a câmera
  const low = (x: number) => x > -8 && x < 46
  for (const x of LAMP_XS) lampHeads.push(new THREE.Vector3(x, QUAY_TOP + (low(x) ? 1.1 : LAMP_H), LAMP_Z))
  for (let x = -70; x <= 60; x += 32) for (let z = -40; z >= -120; z -= 22) lampHeads.push(new THREE.Vector3(x, QUAY_TOP + LAMP_H + 6, z))
  for (const h of lampHeads) {
    if (pi >= poles.count) break
    const hh = h.y - QUAY_TOP
    m4.compose(new THREE.Vector3(h.x, QUAY_TOP + hh / 2, h.z), new THREE.Quaternion(), new THREE.Vector3(hh < 2 ? 2.2 : 1, hh / LAMP_H, hh < 2 ? 2.2 : 1))
    poles.setMatrixAt(pi++, m4)
    const small = hh < 2
    addGlow(h, '#ff9a4a', small ? 1.4 : 3.8)
    addGlow(h.clone().add(new THREE.Vector3(0, -0.15, 0)), '#ffe0b0', small ? 0.45 : 1.1)
  }
  poles.count = pi
  group.add(poles)
  // cabeças das luminárias: carcaça escura com difusor emissivo voltado para baixo
  const tall = lampHeads.filter((h) => h.y - QUAY_TOP > 2)
  const headGeo = new THREE.BoxGeometry(1.6, 0.35, 0.7)
  const heads = new THREE.InstancedMesh(headGeo, dark, tall.length)
  const lensGeo = new THREE.PlaneGeometry(1.4, 0.5)
  lensGeo.rotateX(Math.PI / 2)
  const lenses = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc58a').multiplyScalar(4), side: THREE.DoubleSide }), tall.length)
  tall.forEach((h, i) => {
    m4.makeTranslation(h.x, h.y + 0.25, h.z)
    heads.setMatrixAt(i, m4)
    m4.makeTranslation(h.x, h.y + 0.06, h.z)
    lenses.setMatrixAt(i, m4)
  })
  group.add(heads, lenses)

  // ——— Navio porta-contêineres atracado à esquerda
  const ship = createShip([contSide, contSide, contSide, contSide, contDoor, contDoor], addGlow)
  ship.position.set(-128, 0, QUAY_EDGE_Z + 12)
  group.add(ship)

  // ——— Guarita + cancela (credencial)
  const booth = new THREE.Group()
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: '#e8e4db', roughness: 0.8 }))
  cabin.position.set(0, 1.5, 0)
  booth.add(cabin)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.6) }))
  win.position.set(0, 1.9, 1.51)
  booth.add(win)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 3.8), dark)
  roof.position.y = 3.15
  booth.add(roof)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: '#d33', roughness: 0.6 }))
  arm.geometry.translate(3.5, 0, 0)
  arm.position.set(1.8, 1.2, 1.2)
  booth.add(arm)
  booth.userData.arm = arm
  booth.position.set(BADGE_POS.x - 5.5, QUAY_TOP, QUAY_EDGE_Z - 5)
  group.add(booth)
  addGlow(new THREE.Vector3(BADGE_POS.x - 5.5, QUAY_TOP + 2, QUAY_EDGE_Z - 3.4), '#ffcf8a', 1.6)

  // ——— Quebra-mar até o farol
  const rockGeo = new THREE.IcosahedronGeometry(1, 0)
  const rockMat = new THREE.MeshStandardMaterial({ color: '#34343a', roughness: 1, flatShading: true })
  const rockCount = TIER.low ? 170 : 320
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
  for (let i = 0; i < rockCount; i++) {
    const t = rand()
    const x = QUAY_X[1] - 2 + t * (LIGHTHOUSE.x + 8 - QUAY_X[1])
    const z = LIGHTHOUSE.z + (rand() - 0.5) * 9
    const s = 1.1 + rand() * 1.8
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3))
    m4.compose(new THREE.Vector3(x, -0.4 + rand() * 1.4, z), q, new THREE.Vector3(s, s * 0.8, s))
    rocks.setMatrixAt(i, m4)
  }
  group.add(rocks)

  // ——— Sprites de brilho (um único draw call)
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3))
  glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(glowColors, 3))
  glowGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(glowSizes, 1))
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uTex: { value: glowTexture() }, uScale: { value: 400 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSize; uniform float uScale; uniform float uTime;
      varying vec3 vColor;
      void main() {
        vColor = color * (0.92 + 0.08 * sin(uTime * 13.0 + position.x));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * uScale / -mv.z, 160.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; varying vec3 vColor;
      void main() {
        float a = texture2D(uTex, gl_PointCoord).a;
        a = a * a;
        gl_FragColor = vec4(vColor * a * 1.5, a);
        #include <colorspace_fragment>
      }
    `
  })
  const glows = new THREE.Points(glowGeo, glowMat)
  glows.frustumCulled = false
  group.add(glows)

  return {
    group,
    projects,
    gantry,
    trolley,
    cables,
    spreader,
    spot,
    blinkers,
    booth,
    glowMat,
    legH,
    liftHeight: LIFT_HEIGHT
  }
}

function createSTS(steel: THREE.Material, dark: THREE.Material) {
  const g = new THREE.Group()
  const H = 30
  for (const dx of [-5, 5]) {
    for (const dz of [-7, 7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, H, 0.9), steel)
      leg.position.set(dx, H / 2, dz)
      g.add(leg)
    }
  }
  for (const dx of [-5, 5]) {
    const boom = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 62), steel)
    boom.position.set(dx, H, 10)
    g.add(boom)
    const aframe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), steel)
    aframe.position.set(dx, H + 4.5, -3)
    g.add(aframe)
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 30), dark)
    tie.position.set(dx, H + 4.5, 12)
    tie.rotation.x = 0.28
    g.add(tie)
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 1.2), steel)
  cross.position.set(0, H, -7)
  g.add(cross)
  const cross2 = cross.clone()
  cross2.position.z = 7
  g.add(cross2)
  const house = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), dark)
  house.position.set(0, H + 2.6, -8)
  g.add(house)
  return g
}

function createShip(contMat: THREE.Material[], addGlow: (p: THREE.Vector3, c: THREE.ColorRepresentation, s: number) => void) {
  const ship = new THREE.Group()
  const L = 88
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(L, 7, 13),
    new THREE.MeshStandardMaterial({ color: '#2a0f12', roughness: 0.7, metalness: 0.3 })
  )
  hull.position.y = 2.4
  ship.add(hull)
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 7, 3, 1), hull.material)
  bow.rotation.y = Math.PI / 6
  bow.scale.set(1.2, 1, 1)
  bow.position.set(L / 2 + 2, 2.4, 0)
  ship.add(bow)
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 12), new THREE.MeshStandardMaterial({ color: '#dcd8cf', roughness: 0.8 }))
  bridge.position.set(-L / 2 + 6, 11.5, 0)
  ship.add(bridge)
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2b8').multiplyScalar(2) }))
  bw.scale.set(12, 14, 1)
  bw.rotation.y = Math.PI / 2
  bw.position.set(-L / 2 + 9.55, 15.5, 0)
  ship.add(bw)
  addGlow(new THREE.Vector3(-128 - L / 2 + 6, 19, QUAY_EDGE_Z + 12), '#ffffff', 1.4)
  const rand = mulberry(3)
  const n = 60
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 2.59, 6.06), contMat, n)
  const m4 = new THREE.Matrix4()
  let i = 0
  for (let bay = 0; bay < 12 && i < n; bay++) {
    const h = 2 + Math.floor(rand() * 3)
    for (let k = 0; k < h && i < n; k++) {
      for (const dz of [-3.1, 3.1]) {
        if (i >= n) break
        m4.makeTranslation(-L / 2 + 14 + bay * 2.6 * 2.3, 7.2 + k * 2.59, dz)
        inst.setMatrixAt(i, m4)
        inst.setColorAt(i, new THREE.Color(PALETTE[Math.floor(rand() * PALETTE.length)]))
        i++
      }
    }
  }
  inst.count = i
  ship.add(inst)
  return ship
}

function mulberry(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
