import * as THREE from 'three'
import { LIGHTHOUSE, LIGHTHOUSE_H, LANTERN } from './layout'
import { glowTexture, lighthouseTexture } from './textures'

export function createLighthouse() {
  const group = new THREE.Group()
  group.position.copy(LIGHTHOUSE)

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 6, 3, 10),
    new THREE.MeshStandardMaterial({ color: '#4a4a50', roughness: 1, flatShading: true })
  )
  base.position.y = 1.5
  group.add(base)

  const towerMat = new THREE.MeshStandardMaterial({ map: lighthouseTexture(), roughness: 0.85, envMapIntensity: 0.6 })
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 3.2, LIGHTHOUSE_H - 3, 24, 1, true), towerMat)
  tower.position.y = 3 + (LIGHTHOUSE_H - 3) / 2
  group.add(tower)

  const dark = new THREE.MeshStandardMaterial({ color: '#141417', roughness: 0.6, metalness: 0.5 })
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.4, 20), dark)
  gallery.position.y = LIGHTHOUSE_H
  group.add(gallery)

  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d0').multiplyScalar(3) })
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 16), lanternMat)
  lantern.position.y = LIGHTHOUSE_H + 1.5
  group.add(lantern)
  // cúpula de vidro com montantes metálicos
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 2.6, 24, 1, true),
    new THREE.MeshPhysicalMaterial({ color: '#ffe8c4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, envMapIntensity: 2 })
  )
  glass.position.y = LIGHTHOUSE_H + 1.5
  group.add(glass)
  const mullion = new THREE.BoxGeometry(0.08, 2.6, 0.08)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const m = new THREE.Mesh(mullion, dark)
    m.position.set(Math.cos(a) * 1.46, LIGHTHOUSE_H + 1.5, Math.sin(a) * 1.46)
    group.add(m)
  }
  // guarda-corpo da galeria
  const railRing = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.05, 6, 40), dark)
  railRing.rotation.x = Math.PI / 2
  railRing.position.y = LIGHTHOUSE_H + 1.1
  group.add(railRing)
  const post = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4)
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const m = new THREE.Mesh(post, dark)
    m.position.set(Math.cos(a) * 2.9, LIGHTHOUSE_H + 0.65, Math.sin(a) * 2.9)
    group.add(m)
  }
  // janelinhas acesas ao longo da torre
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d9893a').multiplyScalar(0.9) })
  for (let i = 0; i < 4; i++) {
    const y = 6 + i * 5.2
    const r = 3.2 - ((y - 3) / (LIGHTHOUSE_H - 3)) * 1.3
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.9), winMat)
    const a = Math.PI * 0.35 + i * 0.4
    w.position.set(Math.cos(a) * (r + 0.02), y, Math.sin(a) * (r + 0.02))
    w.lookAt(Math.cos(a) * 10, y, Math.sin(a) * 10)
    group.add(w)
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.8, 16), dark)
  cap.position.y = LIGHTHOUSE_H + 3.7
  group.add(cap)

  // Feixes: dois cones opostos em um pivô giratório
  const pivot = new THREE.Group()
  pivot.position.set(0, LANTERN.y - LIGHTHOUSE.y - 0.7, 0)
  group.add(pivot)
  const beamUniforms = { uIntensity: { value: 1 }, uTime: { value: 0 } }
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: beamUniforms,
    vertexShader: /* glsl */ `
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() {
        vAlong = uv.y;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensity; uniform float uTime;
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(vAlong, 2.2);
        float a = edge * fall * 0.32 * uIntensity;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, a);
        #include <colorspace_fragment>
      }
    `
  })
  const L = 140
  const beamGeo = new THREE.ConeGeometry(14, L, 32, 1, true)
  // uv.y = 1 na ponta (origem), 0 na base
  beamGeo.translate(0, -L / 2, 0)
  beamGeo.rotateZ(Math.PI / 2) // aponta para +x
  const beamA = new THREE.Mesh(beamGeo, beamMat)
  const beamB = new THREE.Mesh(beamGeo, beamMat)
  beamB.rotation.y = Math.PI
  pivot.add(beamA, beamB)

  const halo = new THREE.PointLight('#ffdcaa', 60, 30, 1.5)
  halo.position.y = LIGHTHOUSE_H + 1.5
  group.add(halo)

  // lens flare: brilho redondo + risco anamórfico quando o feixe cruza a câmera
  const glow = glowTexture()
  const mk = (color: string) =>
    new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })
    )
  const flare = mk('#ffe6c0')
  const streak = mk('#ffb070')
  flare.position.y = streak.position.y = LIGHTHOUSE_H + 1.5
  group.add(flare, streak)

  return { group, pivot, beamUniforms, lanternMat, flare, streak }
}
