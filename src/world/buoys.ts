import * as THREE from 'three'
import { BUOYS } from './layout'

export function createBuoys() {
  const group = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#c9372c', roughness: 0.6 })
  const ringMat = new THREE.MeshStandardMaterial({ color: '#efe9dd', roughness: 0.6 })
  const buoys = BUOYS.map((p, i) => {
    const b = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 1.6, 12), bodyMat)
    body.position.y = 0.4
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.35, 12), ringMat)
    ring.position.y = 0.9
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 2.6, 8), bodyMat)
    mast.position.y = 2.3
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf7a') })
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), lampMat)
    lamp.position.y = 3.8
    b.add(body, ring, mast, lamp)
    b.position.copy(p)
    group.add(b)
    return { group: b, lampMat, phase: i * 1.7, lit: 0 }
  })

  // rota tracejada entre as boias
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(44, 0, 8), ...BUOYS, new THREE.Vector3(140, 0, 24)])
  const pts = curve.getSpacedPoints(160)
  const pos = new Float32Array(pts.length * 3)
  const along = new Float32Array(pts.length)
  pts.forEach((p, i) => {
    pos.set([p.x, 0.25, p.z], i * 3)
    along[i] = i / (pts.length - 1)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  const routeUniforms = { uReveal: { value: 0 }, uTime: { value: 0 }, uScale: { value: 400 } }
  const routeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: routeUniforms,
    vertexShader: /* glsl */ `
      attribute float aAlong; uniform float uReveal; uniform float uTime; uniform float uScale;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, sin(uTime * 1.3 + position.x * 0.2) * 0.2, 0.0), 1.0);
        gl_Position = projectionMatrix * mv;
        float on = smoothstep(uReveal, uReveal - 0.04, aAlong);
        float pulse = 0.5 + 0.5 * sin(aAlong * 90.0 - uTime * 4.0);
        vA = on * (0.35 + 0.65 * pulse);
        gl_PointSize = 0.9 * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * a * 2.0, a);
        #include <colorspace_fragment>
      }
    `
  })
  const route = new THREE.Points(g, routeMat)
  route.frustumCulled = false
  group.add(route)

  return { group, buoys, routeUniforms }
}
