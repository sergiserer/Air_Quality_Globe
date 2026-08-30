import * as THREE from 'three';

const MIN_POINT_SIZE = 6.5;
const MAX_POINT_SIZE = 15.0;
const SIZE_CEILING_VALUE = 80;

// Same severity breakpoints as before, but colors blend smoothly between
// them instead of snapping at the boundary — a fuller, more homogeneous
// look on the globe, trading off exact per-band precision.
const COLOR_STOPS = [
  { value: 0, color: [0, 1, 0.392] },   // Verde
  { value: 12, color: [0, 1, 0.392] },  // Verde
  { value: 35, color: [1, 0.863, 0] },  // Amarillo
  { value: 55, color: [1, 0.392, 0] },  // Naranja
  { value: 80, color: [1, 0, 0] },      // Rojo
];

function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function getSeverityColor(value) {
  const v = Math.max(0, value);
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const from = COLOR_STOPS[i];
    const to = COLOR_STOPS[i + 1];
    if (v <= to.value) {
      const t = to.value === from.value ? 0 : (v - from.value) / (to.value - from.value);
      return lerpColor(from.color, to.color, t);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color;
}

export function getPointSize(value) {
  const t = Math.min(Math.max(value, 0), SIZE_CEILING_VALUE) / SIZE_CEILING_VALUE;
  return MIN_POINT_SIZE + t * (MAX_POINT_SIZE - MIN_POINT_SIZE);
}

export function buildPointsGeometryData(points, getCoords) {
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  const sizes = new Float32Array(points.length);

  points.forEach((point, i) => {
    const { x, y, z } = getCoords(point.lat, point.lng);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const [r, g, b] = getSeverityColor(point.value);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    sizes[i] = getPointSize(point.value);
  });

  return { positions, colors, sizes };
}

const VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float pulse = 1.0 + 0.15 * sin(uTime * 2.0 + position.x * 10.0 + position.z * 10.0);
    gl_PointSize = size * pulse * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, 1.0) * tex;
  }
`;

export function createPointsMaterial(glowTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: glowTexture },
      uTime: { value: 0 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function createPointsObject(points, getCoords, glowTexture) {
  const { positions, colors, sizes } = buildPointsGeometryData(points, getCoords);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = createPointsMaterial(glowTexture);

  return new THREE.Points(geometry, material);
}

export function disposePointsObject(pointsObject) {
  if (!pointsObject) return;
  pointsObject.geometry.dispose();
  pointsObject.material.dispose();
}
