import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js';
import { LineMaterial } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/lines/LineSegmentsGeometry.js';

// Isolado e desminificado de static/js/main.cb39a847.js.
// Constantes e animação preservam a implementação original do teclado.
const ROWS = 12;
const COLUMNS = 20;
const KEY_SPACING = 1.84;
const KEY_RADIUS = 1.12;
const KEY_OUTER_RADIUS = 0.7616000000000002;
const KEY_HEIGHT = 0.76;
const OUTER_LINE_FADE = [0, 0.35];
const INNER_LINE_FADE = [0.2, 0.6];
const EDGE_FALLOFF_START = 0.55;
const DARK_PALETTE = [0x5a3028, 0xffb716, 0xf73532, 0x92247d];
const LIGHT_PALETTE = [0x4a2924, 0xe5a318, 0xd93c36, 0x762263];

const smoothstep = (value) => value * value * (3 - 2 * value);
const clamp = (value) => Math.max(0, Math.min(1, value));

function interpolateColor(progress, palette) {
  const lastIndex = palette.length - 1;
  const index = Math.min(Math.floor(progress * lastIndex), lastIndex - 1);
  const remainder = progress * lastIndex - index;

  return new THREE.Color(palette[index]).lerp(new THREE.Color(palette[index + 1]), remainder);
}

function interpolatePoint(from, to, progress) {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
    from[2] + (to[2] - from[2]) * progress,
  ];
}

function createKeyboardBackground(mount, theme = 'dark') {
  const isDarkTheme = theme !== 'light';
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  const palette = isDarkTheme ? DARK_PALETTE : LIGHT_PALETTE;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(isDarkTheme ? 0x251a1b : 0xf7eedb);
  mount.style.transition = 'opacity 0.4s ease';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const cameraSize = 8.5;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  camera.position.set(-14, 20, 25);
  camera.lookAt(0, 0, 0);

  function setCameraBounds(containerWidth, containerHeight) {
    const aspect = containerWidth / containerHeight;
    camera.left = -8.5 * aspect;
    camera.right = cameraSize * aspect;
    camera.top = cameraSize;
    camera.bottom = -8.5;
    camera.updateProjectionMatrix();
  }

  setCameraBounds(width, height);
  scene.add(new THREE.AmbientLight(isDarkTheme ? 0x3b2222 : 0xbfae95, 1.6));

  const directionalLight = new THREE.DirectionalLight(isDarkTheme ? 0xffeed0 : 0x7e5c4d, 1.6);
  directionalLight.position.set(-5, 12, 8);
  scene.add(directionalLight);

  const interactionPlaneGeometry = new THREE.PlaneGeometry(50, 34);
  const interactionPlaneMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const interactionPlane = new THREE.Mesh(interactionPlaneGeometry, interactionPlaneMaterial);
  interactionPlane.rotation.x = -Math.PI / 2;
  scene.add(interactionPlane);

  const innerRadius = KEY_RADIUS / Math.SQRT2;
  const outerRadius = KEY_OUTER_RADIUS / Math.SQRT2;
  const keyGeometry = new THREE.CylinderGeometry(
    outerRadius,
    innerRadius,
    KEY_HEIGHT,
    4,
    1,
    false,
    Math.PI / 4,
  );

  const topInset = 0.56;
  const topRadius = KEY_OUTER_RADIUS / 2;
  const topHeight = 0.38;
  const bottomCorners = [
    [topInset, -topHeight, topInset],
    [topInset, -topHeight, -topInset],
    [-topInset, -topHeight, -topInset],
    [-topInset, -topHeight, topInset],
  ];
  const topCorners = [
    [topRadius, topHeight, topRadius],
    [topRadius, topHeight, -topRadius],
    [-topRadius, topHeight, -topRadius],
    [-topRadius, topHeight, topRadius],
  ];
  const cornerPairs = [
    [bottomCorners[0], topCorners[0]],
    [bottomCorners[1], topCorners[1]],
    [bottomCorners[2], topCorners[2]],
    [bottomCorners[3], topCorners[3]],
  ];

  const outerLinePositions = [];
  const innerLinePositions = [];
  [
    [bottomCorners[0], bottomCorners[1]],
    [bottomCorners[1], bottomCorners[2]],
    [bottomCorners[2], bottomCorners[3]],
    [bottomCorners[3], bottomCorners[0]],
    [topCorners[0], topCorners[1]],
    [topCorners[1], topCorners[2]],
    [topCorners[2], topCorners[3]],
    [topCorners[3], topCorners[0]],
  ].forEach(([from, to]) => {
    const firstInset = interpolatePoint(from, to, 0.35);
    const secondInset = interpolatePoint(to, from, 0.35);
    outerLinePositions.push(...from, ...firstInset, ...to, ...secondInset);
    innerLinePositions.push(...firstInset, ...secondInset);
  });
  cornerPairs.forEach(([from, to]) => outerLinePositions.push(...from, ...to));

  const outerLineGeometry = new LineSegmentsGeometry().setPositions(outerLinePositions);
  const innerLineGeometry = new LineSegmentsGeometry().setPositions(innerLinePositions);
  const highlightSize = 0.92;
  const highlightLineGeometry = new LineSegmentsGeometry().setPositions([
    -highlightSize, 0, -highlightSize,
    highlightSize, 0, -highlightSize,
    highlightSize, 0, -highlightSize,
    highlightSize, 0, highlightSize,
    highlightSize, 0, highlightSize,
    -highlightSize, 0, highlightSize,
    -highlightSize, 0, highlightSize,
    -highlightSize, 0, -highlightSize,
  ]);
  const topPlaneGeometry = new THREE.PlaneGeometry(KEY_SPACING, KEY_SPACING);

  const gridStartX = -19;
  const gridStartZ = -11;
  const keyCount = ROWS * COLUMNS;
  const keyGroups = [];
  const keyX = new Float32Array(keyCount);
  const keyZ = new Float32Array(keyCount);
  const edgeFalloff = new Float32Array(keyCount);
  const keyBodyMaterials = [];
  const outerLineMaterials = [];
  const innerLineMaterials = [];
  const highlightLineMaterials = [];
  const topPlaneMaterials = [];
const targetActivation = new Float32Array(keyCount);
const activation = new Float32Array(keyCount);
const hueShiftPulse = new Float32Array(keyCount);
const hue = new Float32Array(keyCount);
  const saturation = new Float32Array(keyCount);
  const lightness = new Float32Array(keyCount);

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const index = row * COLUMNS + column;
      const color = interpolateColor((row + column) / 30, palette);
      const normalizedX = (column - 9.5) / 9.5;
      const normalizedZ = (row - 5.5) / 5.5;
      const edgeDistance = Math.min(1, Math.hypot(normalizedX, normalizedZ));
      const fade = 1 - smoothstep(clamp((edgeDistance - EDGE_FALLOFF_START) / (1 - EDGE_FALLOFF_START)));
      edgeFalloff[index] = fade;

      const colorHsl = { h: 0, s: 0, l: 0 };
      color.getHSL(colorHsl);
      hue[index] = colorHsl.h;
      saturation[index] = colorHsl.s;
      lightness[index] = colorHsl.l;

      const keyMaterial = new THREE.MeshPhongMaterial({
        color: isDarkTheme ? 0x241719 : 0xe8d8b8,
        emissive: color,
        emissiveIntensity: isDarkTheme ? 0.12 : 0.05,
        shininess: isDarkTheme ? 30 : 6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const outerLineMaterial = new LineMaterial({
        color: color.getHex(),
        linewidth: isDarkTheme ? 3.8 : 3,
        resolution: new THREE.Vector2(width, height),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const innerLineMaterial = new LineMaterial({
        color: color.getHex(),
        linewidth: isDarkTheme ? 3.8 : 3,
        resolution: new THREE.Vector2(width, height),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const highlightLineMaterial = new LineMaterial({
        color: color.getHex(),
        linewidth: isDarkTheme ? 4.2 : 3.2,
        resolution: new THREE.Vector2(width, height),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const topPlaneMaterial = new THREE.MeshBasicMaterial({
        color: color.getHex(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

      const group = new THREE.Group();
      const body = new THREE.Mesh(keyGeometry, keyMaterial);
      const outerLines = new LineSegments2(outerLineGeometry, outerLineMaterial);
      const innerLines = new LineSegments2(innerLineGeometry, innerLineMaterial);
      group.add(body, outerLines, innerLines);

      const x = gridStartX + 2 * column;
      const z = gridStartZ + 2 * row;
      group.position.set(x, 0, z);
      group.scale.set(1, 0.02, 1);
      scene.add(group);

      const highlightLines = new LineSegments2(highlightLineGeometry, highlightLineMaterial);
      highlightLines.position.set(x, 0, z);
      scene.add(highlightLines);

      const topPlane = new THREE.Mesh(topPlaneGeometry, topPlaneMaterial);
      topPlane.rotation.x = -Math.PI / 2;
      topPlane.position.set(x, 0.006, z);
      scene.add(topPlane);

      keyGroups.push(group);
      keyX[index] = x;
      keyZ[index] = z;
      keyBodyMaterials.push(keyMaterial);
      outerLineMaterials.push(outerLineMaterial);
      innerLineMaterials.push(innerLineMaterial);
      highlightLineMaterials.push(highlightLineMaterial);
      topPlaneMaterials.push(topPlaneMaterial);
    }
  }

  const starBuckets = [[], [], []];
  const starBucket = () => {
    const value = Math.random();
    return value < 0.55 ? 0 : value < 0.85 ? 1 : 2;
  };

  for (let row = 0; row < 13; row += 1) {
    for (let column = 0; column < 21; column += 1) {
      const x = 2 * column - 20;
      const z = 2 * row - 12;
      const color = interpolateColor((row + column) / 32, palette);
      const normalizedX = (column - 10) / 10;
      const normalizedZ = (row - 6) / 6;
      const edgeDistance = Math.min(1, Math.hypot(normalizedX, normalizedZ));
      const fade = 1 - smoothstep(clamp((edgeDistance - EDGE_FALLOFF_START) / (1 - EDGE_FALLOFF_START)));
      starBuckets[starBucket()].push(
        x, 0.015, z,
        color.r * fade, color.g * fade, color.b * fade,
        Math.random(), 0.5 + 0.8 * Math.random(),
      );
    }
  }

  const starSizes = [3, 5, 8];
  const starGeometries = [];
  const starMaterials = [];
  starBuckets.forEach((bucket, bucketIndex) => {
    if (bucket.length === 0) return;

    const pointCount = bucket.length / 8;
    const positions = new Float32Array(3 * pointCount);
    const colors = new Float32Array(3 * pointCount);
    const phases = new Float32Array(pointCount);
    const speeds = new Float32Array(pointCount);

    for (let sourceIndex = 0, positionIndex = 0, pointIndex = 0; sourceIndex < bucket.length; sourceIndex += 8, positionIndex += 3, pointIndex += 1) {
      positions[positionIndex] = bucket[sourceIndex];
      positions[positionIndex + 1] = bucket[sourceIndex + 1];
      positions[positionIndex + 2] = bucket[sourceIndex + 2];
      colors[positionIndex] = bucket[sourceIndex + 3];
      colors[positionIndex + 1] = bucket[sourceIndex + 4];
      colors[positionIndex + 2] = bucket[sourceIndex + 5];
      phases[pointIndex] = bucket[sourceIndex + 6];
      speeds[pointIndex] = bucket[sourceIndex + 7];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute('speed', new THREE.Float32BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: starSizes[bucketIndex] },
        uOpacity: { value: 0.62 },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float phase;
        attribute float speed;
        uniform float uTime;
        uniform float uBaseSize;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vColor = color;
          float tw = 0.5 + 0.5 * sin(uTime * speed * 3.0 + phase * 6.28318);
          vTwinkle = tw;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uBaseSize * (0.45 + 0.85 * tw);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          if (dot(d, d) > 0.25) discard;
          gl_FragColor = vec4(vColor, uOpacity * (0.35 + 0.65 * vTwinkle));
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    scene.add(new THREE.Points(geometry, material));
    starGeometries.push(geometry);
    starMaterials.push(material);
  });

  let lightThemeParticles = null;
  if (isDarkTheme) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(660);
    for (let index = 0; index < 660; index += 1) positions[index] = 46 * (Math.random() - 0.5);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lightThemeParticles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xffeed0,
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    scene.add(lightThemeParticles);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-9999, -9999);
  let lastMouseMove = performance.now();

  function onMouseMove(event) {
    if (event.target instanceof Element && event.target.closest('.skills-section')) {
      pointer.set(-9999, -9999);
      lastMouseMove = performance.now();
      return;
    }

    const bounds = mount.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    lastMouseMove = performance.now();
  }

  window.addEventListener('mousemove', onMouseMove);

  const waveStart = new THREE.Vector3(gridStartX, 0, gridStartZ);
  const waveEnd = new THREE.Vector3(19, 0, 11);
  const wavePoint = new THREE.Vector3();
  const hueColor = new THREE.Color();
  let previousTime = performance.now();
  let animationFrame;

  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - previousTime) / 1000);
    previousTime = now;
    const isIdle = now - lastMouseMove > 1800;
    const elapsedSeconds = now / 1000;

    starMaterials.forEach((material) => {
      material.uniforms.uTime.value = elapsedSeconds;
    });

    let focusPoint = null;
    let shouldUseWave = isIdle;
    if (!isIdle) {
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(interactionPlane);
      focusPoint = intersections.length > 0 ? intersections[0].point : null;
      shouldUseWave = !focusPoint;
    }

    if (shouldUseWave) {
      const phase = (now % 7000) / 7000 * 2;
      const triangleWave = phase < 1 ? phase : 2 - phase;
      wavePoint.copy(waveStart).lerp(waveEnd, smoothstep(triangleWave));
      focusPoint = wavePoint;
    }

    const radius = shouldUseWave ? 6 : 2.3;
    const falloffPower = shouldUseWave ? 2.6 : 0.6;
    const scrollDim = 0;

    for (let index = 0; index < keyCount; index += 1) {
      const distance = Math.hypot(focusPoint.x - keyX[index], focusPoint.z - keyZ[index]) / 2;
      const radialFade = Math.max(0, Math.min(1, 1 - distance / radius));
      targetActivation[index] = smoothstep(Math.pow(radialFade, falloffPower));

      const target = targetActivation[index];
      const current = activation[index];
      activation[index] += (target - current) * (target > current ? 0.22 : 0.12);
      const amount = activation[index];
      const edge = edgeFalloff[index];
      const scaleY = THREE.MathUtils.lerp(0.02, 1, amount);

      keyGroups[index].scale.set(1, scaleY, 1);
      keyGroups[index].position.y = scaleY * KEY_HEIGHT / 2 + 0.1 * amount;
      outerLineMaterials[index].opacity = smoothstep(clamp((amount - OUTER_LINE_FADE[0]) / (OUTER_LINE_FADE[1] - OUTER_LINE_FADE[0]))) * edge;
      innerLineMaterials[index].opacity = smoothstep(clamp((amount - INNER_LINE_FADE[0]) / (INNER_LINE_FADE[1] - INNER_LINE_FADE[0]))) * edge;
      keyBodyMaterials[index].opacity = smoothstep(Math.max(0, (amount - 0.62) / 0.38)) * edge;
      highlightLineMaterials[index].opacity = THREE.MathUtils.lerp(scrollDim, 1, amount) * edge;
      topPlaneMaterials[index].opacity = 0.55 * smoothstep(amount) * edge;

      hueShiftPulse[index] = !shouldUseWave && amount > 0.75
        ? Math.min(30, hueShiftPulse[index] + deltaTime)
        : Math.max(0, hueShiftPulse[index] - 2 * deltaTime);

      if (hueShiftPulse[index] > 0.05) {
        const shiftedHue = (hue[index] + 0.12 * hueShiftPulse[index]) % 1;
        hueColor.setHSL(shiftedHue, saturation[index], lightness[index]);
        outerLineMaterials[index].color.copy(hueColor);
        innerLineMaterials[index].color.copy(hueColor);
        keyBodyMaterials[index].emissive.copy(hueColor);
        highlightLineMaterials[index].color.copy(hueColor);
        topPlaneMaterials[index].color.copy(hueColor);
      }
    }

    if (lightThemeParticles) lightThemeParticles.rotation.y += 0.000015;
    renderer.render(scene, camera);
  }

  animate();

  function onResize() {
    const nextWidth = mount.clientWidth;
    const nextHeight = mount.clientHeight;
    setCameraBounds(nextWidth, nextHeight);
    renderer.setSize(nextWidth, nextHeight);
    outerLineMaterials.forEach((material) => material.resolution.set(nextWidth, nextHeight));
    innerLineMaterials.forEach((material) => material.resolution.set(nextWidth, nextHeight));
    highlightLineMaterials.forEach((material) => material.resolution.set(nextWidth, nextHeight));
  }

  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
    if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    keyGeometry.dispose();
    outerLineGeometry.dispose();
    innerLineGeometry.dispose();
    highlightLineGeometry.dispose();
    topPlaneGeometry.dispose();
    interactionPlaneGeometry.dispose();
    interactionPlaneMaterial.dispose();
    starGeometries.forEach((geometry) => geometry.dispose());
    starMaterials.forEach((material) => material.dispose());
    keyBodyMaterials.forEach((material) => material.dispose());
    outerLineMaterials.forEach((material) => material.dispose());
    innerLineMaterials.forEach((material) => material.dispose());
    highlightLineMaterials.forEach((material) => material.dispose());
    topPlaneMaterials.forEach((material) => material.dispose());
    if (lightThemeParticles) {
      lightThemeParticles.geometry.dispose();
      lightThemeParticles.material.dispose();
    }
    renderer.dispose();
  };
}

const mount = document.querySelector('#keyboard-background');
const theme = document.documentElement.dataset.theme || 'dark';
createKeyboardBackground(mount, theme);
