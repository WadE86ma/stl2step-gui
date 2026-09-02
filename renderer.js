let scene, camera, webglRenderer, controls, mesh, selectedFile = null;
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

class SimpleOrbitControls {
  constructor(camera, element) {
    this.camera = camera;
    this.element = element;
    this.target = new THREE.Vector3();
    this.mode = 'orbit';
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.theta = Math.PI / 4;
    this.phi = Math.PI / 3;
    this.radius = 200;
    this.minRadius = 0.01;
    this.maxRadius = 1e7;
    this.syncFromCamera();

    element.addEventListener('pointerdown', e => this.onPointerDown(e));
    window.addEventListener('pointermove', e => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
    element.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    element.addEventListener('contextmenu', e => e.preventDefault());
  }
  setMode(mode) { this.mode = mode; }
  syncFromCamera() {
    const v = this.camera.position.clone().sub(this.target);
    this.radius = Math.max(v.length(), this.minRadius);
    this.theta = Math.atan2(v.x, v.z);
    this.phi = Math.acos(THREE.MathUtils.clamp(v.y / this.radius, -1, 1));
  }
  apply() {
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);
  }
  onPointerDown(e) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.element.setPointerCapture?.(e.pointerId);
  }
  onPointerMove(e) {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    const panRequested = this.mode === 'pan' || e.button === 1 || e.buttons === 4 || e.shiftKey || e.buttons === 2;
    if (panRequested) {
      const distance = this.radius;
      const panScale = distance * 0.0017;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.updateMatrixWorld();
      right.setFromMatrixColumn(this.camera.matrixWorld, 0);
      up.setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.target.addScaledVector(right, -dx * panScale);
      this.target.addScaledVector(up, dy * panScale);
    } else if (this.mode !== 'zoom') {
      this.theta -= dx * 0.007;
      this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.007, 0.035, Math.PI - 0.035);
    } else {
      this.radius *= Math.exp(dy * 0.012);
      this.radius = THREE.MathUtils.clamp(this.radius, this.minRadius, this.maxRadius);
    }
    this.apply();
  }
  onPointerUp() { this.dragging = false; }
  onWheel(e) {
    e.preventDefault();
    this.radius *= Math.exp(e.deltaY * 0.0012);
    this.radius = THREE.MathUtils.clamp(this.radius, this.minRadius, this.maxRadius);
    this.apply();
  }
}

function init3D() {
  const c = $('canvas');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e6);
  camera.position.set(120, 100, 120);

  webglRenderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ('outputColorSpace' in webglRenderer) webglRenderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xcfe5ff, 0x18202a, 1.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(120, 180, 100);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb9e8, 0.75);
  fill.position.set(-120, 70, -90);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(-40, 20, 140);
  scene.add(rim);

  controls = new SimpleOrbitControls(camera, c);
  resize();
  animate();
  setupViewTools();
  setupViewCube();
}

function resize() {
  const r = $('dropZone').getBoundingClientRect();
  if (!r.width || !r.height || !camera || !webglRenderer) return;
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  webglRenderer.setSize(r.width, r.height, false);
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  if (webglRenderer && scene && camera) {
    webglRenderer.render(scene, camera);
    updateViewCube();
  }
}

function updateViewCube() {
  const cube = $('cube3d');
  if (!cube || !camera) return;
  // The cube represents the world orientation as seen by the camera.
  // Using the inverse camera quaternion makes it track orbiting exactly.
  const q = camera.quaternion.clone().invert();
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  const rx = THREE.MathUtils.radToDeg(e.x);
  const ry = THREE.MathUtils.radToDeg(e.y);
  const rz = THREE.MathUtils.radToDeg(e.z);
  cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
}

function parseSTL(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const dv = new DataView(arrayBuffer);
  const vertices = [];
  let binary = false;

  if (dv.byteLength >= 84) {
    const n = dv.getUint32(80, true);
    binary = Number.isFinite(n) && 84 + n * 50 === dv.byteLength;
  }

  if (binary) {
    const n = dv.getUint32(80, true);
    for (let i = 0, o = 84; i < n; i++, o += 50) {
      for (let j = 0; j < 3; j++) {
        const b = o + 12 + j * 12;
        vertices.push(dv.getFloat32(b, true), dv.getFloat32(b + 4, true), dv.getFloat32(b + 8, true));
      }
    }
  } else {
    const txt = new TextDecoder().decode(bytes);
    const re = /vertex\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)/g;
    let m;
    while ((m = re.exec(txt))) vertices.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  if (vertices.length < 9 || vertices.some(v => !Number.isFinite(v))) return null;
  const pos = new Float32Array(vertices);
  return { positions: pos, triangles: pos.length / 9 };
}

async function loadPreview() {
  try {
    const r = await window.api.readActiveStl();
    if (!r?.ok) throw new Error(r?.error || 'Could not read STL');

    let buf;
    if (r.data instanceof ArrayBuffer) {
      buf = r.data;
    } else if (ArrayBuffer.isView(r.data)) {
      buf = r.data.buffer.slice(r.data.byteOffset, r.data.byteOffset + r.data.byteLength);
    } else if (r.data?.type === 'Buffer' && Array.isArray(r.data.data)) {
      buf = new Uint8Array(r.data.data).buffer;
    } else if (Array.isArray(r.data)) {
      buf = new Uint8Array(r.data).buffer;
    } else {
      throw new Error('Unexpected file data returned by Electron');
    }

    const parsed = parseSTL(buf);
    if (!parsed) throw new Error('Unsupported or invalid STL file');
    renderSTL(parsed);
  } catch (e) {
    console.error('STL preview failed:', e);
    $('dropHintTitle').textContent = 'Preview failed';
    $('dropHintText').textContent = e.message || 'Could not display this STL';
    qs('.drop-hint').style.display = 'block';
    setFooter('Preview failed', false);
  }
}

function renderSTL(data) {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  g.computeVertexNormals();
  g.computeBoundingBox();

  const material = new THREE.MeshStandardMaterial({
    color: 0x9da8b3,
    metalness: 0.42,
    roughness: 0.38,
    side: THREE.DoubleSide
  });
  mesh = new THREE.Mesh(g, material);

  const rawBox = g.boundingBox.clone();
  const size = rawBox.getSize(new THREE.Vector3());
  const center = rawBox.getCenter(new THREE.Vector3());
  mesh.position.copy(center).multiplyScalar(-1);
  scene.add(mesh);
  fitModel(size);

  $('stats').classList.remove('hidden');
  $('stats').innerHTML = `
    <div><span>Triangles</span><b>${Math.round(data.triangles).toLocaleString()}</b></div>
    <div><span>Vertices</span><b>${Math.round(data.positions.length / 3).toLocaleString()}</b></div>
    <div class="stats-head">Bounds (mm)</div>
    <div><span>X</span><b>${size.x.toFixed(2)}</b></div>
    <div><span>Y</span><b>${size.y.toFixed(2)}</b></div>
    <div><span>Z</span><b>${size.z.toFixed(2)}</b></div>`;
  qs('.drop-hint').style.display = 'none';
  setFooter('Ready', true);
}

function fitModel(sizeOverride) {
  if (!mesh || !controls) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = sizeOverride || box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  camera.near = Math.max(max / 10000, 0.001);
  camera.far = Math.max(max * 100, 1000);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  camera.position.set(max * 1.55, max * 1.2, max * 1.55);
  controls.syncFromCamera();
  controls.minRadius = max * 0.08;
  controls.maxRadius = max * 40;
  controls.apply();
}

function setCameraView(view) {
  if (!mesh || !controls) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const d = Math.max(size.x, size.y, size.z) * 2.3;
  controls.target.set(0, 0, 0);
  if (view === 'top') camera.position.set(0, d, 0.001);
  if (view === 'bottom') camera.position.set(0, -d, 0.001);
  if (view === 'front') camera.position.set(0, 0, d);
  if (view === 'back') camera.position.set(0, 0, -d);
  if (view === 'right') camera.position.set(d, 0, 0);
  if (view === 'left') camera.position.set(-d, 0, 0);
  controls.syncFromCamera();
  controls.apply();
}

function setupViewCube() {
  document.querySelectorAll('.view-cube [data-view]').forEach(el => {
    el.addEventListener('click', () => setCameraView(el.dataset.view));
  });
}

function setupViewTools() {
  document.querySelectorAll('.view-tools button').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'home' || action === 'fit') {
        fitModel();
        return;
      }
      if (action === 'cube') {
        setCameraView('front');
        return;
      }
      document.querySelectorAll('.view-tools button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      if (action === 'pan') controls.setMode('pan');
      else if (action === 'zoom') controls.setMode('zoom');
      else controls.setMode('orbit');
    });
  });
}

async function setFile(selection) {
  if (!selection?.path) return;
  const p = selection.path;
  selectedFile = p;
  $('inputPath').value = p;
  const out = selection.output || p.replace(/\.[^.]+$/i, '.step');
  $('outputPath').value = out;
  $('convert').disabled = false;
  $('queueCount').textContent = '1';
  $('queueList').innerHTML = `<div class="job"><div><div class="name">${esc(p.split(/[\\/]/).pop())}</div><div class="path">${esc(out)}</div></div><div class="state">Ready</div></div>`;
  $('dropHintTitle').textContent = 'Loading STL…';
  $('dropHintText').textContent = 'Preparing 3D preview';
  qs('.drop-hint').style.display = 'block';
  setFooter('Loading preview…', true);
  await loadPreview();
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setFooter(text, ok = true) {
  $('result').innerHTML = `<span class="dot ${ok ? '' : 'bad'}"></span>${esc(text)}`;
}

function showModal(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); }
$('modalClose').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('helpButton').onclick = () => showModal('STL2STEP Help', `
  <p><b>Add Files</b> or drag an STL directly onto the 3D viewport.</p>
  <p>Rotate with the left mouse button, pan with Shift + drag or the Pan tool, and zoom with the mouse wheel.</p>
  <p><b>TrueForm</b> attempts to recover analytic planes, cylinders and fillets. <b>Verbatim</b> preserves the faceted STL geometry.</p>
  <p>Hover the <span class="mini-info">i</span> symbols under Advanced Options for an explanation of each setting.</p>`);

$('settingsButton').onclick = () => showModal('Application', `
  <div class="about-grid"><span>GUI version</span><b>0.6.2</b><span>Converter</span><b>stl2step</b><span>Default STEP standard</span><b>AP214</b></div>
  <p class="muted-modal">Unofficial GUI powered by BlinkingSun/stl2step (MIT). The portable build uses the bundled converter in the <code>bin</code> folder.</p>
  <p class="muted-modal">Uses Open CASCADE Technology (LGPL-2.1 with the Open CASCADE additional exception). Third-party notices are included with release builds.</p>`);

$('engineHelp').onclick = () => showModal('Conversion engine', `
  <p><b>TrueForm</b> is intended for CAD workflows and tries to reconstruct analytic geometry from the STL mesh.</p>
  <p><b>Verbatim</b> keeps the model as faceted geometry at STL resolution. It is the closest representation of the original tessellation.</p>`);


function setupTooltips() {
  const tooltip = $('globalTooltip');
  if (!tooltip) return;
  const padding = 12;
  const offset = 14;

  function place(e) {
    if (tooltip.classList.contains('hidden')) return;
    const r = tooltip.getBoundingClientRect();
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    if (x + r.width > window.innerWidth - padding) x = e.clientX - r.width - offset;
    if (y + r.height > window.innerHeight - padding) y = window.innerHeight - r.height - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  document.querySelectorAll('.tip[data-tooltip]').forEach(tip => {
    tip.addEventListener('mouseenter', e => {
      tooltip.textContent = tip.dataset.tooltip || '';
      tooltip.classList.remove('hidden');
      place(e);
    });
    tip.addEventListener('mousemove', place);
    tip.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));
  });
}

setupTooltips();

$('addFiles').onclick = async () => setFile(await window.api.pickFile());
$('saveAs').onclick = async () => {
  const p = await window.api.pickOutput($('outputPath').value);
  if (p) $('outputPath').value = p;
};
$('clear').onclick = async () => { await window.api.clearSession(); location.reload(); };

const dz = $('dropZone');
['dragenter','dragover'].forEach(type => dz.addEventListener(type, e => {
  e.preventDefault();
  e.stopPropagation();
  dz.classList.add('drag');
}));
['dragleave','dragend'].forEach(type => dz.addEventListener(type, e => {
  e.preventDefault();
  e.stopPropagation();
  dz.classList.remove('drag');
}));
dz.addEventListener('drop', async e => {
  e.preventDefault();
  e.stopPropagation();
  dz.classList.remove('drag');
  const f = [...(e.dataTransfer?.files || [])].find(x => /\.stl$/i.test(x.name));
  if (!f) {
    setFooter('Only STL files can be dropped here', false);
    return;
  }
  try {
    const selection = await window.api.authorizeDroppedStl(f);
    if (selection?.path) await setFile(selection);
    else setFooter('Could not authorize dropped STL file', false);
  } catch (err) {
    setFooter(err?.message || 'Could not authorize dropped STL file', false);
  }
});

$('convert').onclick = async () => {
  if (!selectedFile) return;
  $('convert').disabled = true;
  $('progressWrap').classList.remove('hidden');
  $('status').textContent = 'Converting…';
  $('pct').textContent = 'Working';
  $('bar').style.width = '50%';

  const a = {
    engine: document.querySelector('input[name=engine]:checked').value,
    units: document.querySelector('input[name=units]:checked').value,
    schema: $('schema').value,
    scale: $('scale').value,
    weld: $('weld').value,
    sewTol: $('sewTol').value,
    unifyAngle: $('unifyAngle').value,
    noUnify: $('noUnify').checked,
    noSolid: $('noSolid').checked,
    forceSew: $('forceSew').checked,
    noVerify: $('noVerify').checked,
    dxf: $('dxf').checked,
    threads: $('threads').value
  };

  const r = await window.api.convert(a);
  $('bar').style.width = '100%';
  $('pct').textContent = '100%';
  if (r.result?.ok || (r.exitCode === 0 && !r.error)) {
    $('status').textContent = 'Completed';
    setFooter('Conversion completed', true);
    qs('.job .state').textContent = 'Completed ✓';
  } else {
    $('status').textContent = 'Failed';
    setFooter(r.error || 'Conversion failed', false);
    qs('.job .state').textContent = 'Failed';
    console.error(r);
  }
  $('convert').disabled = false;
};

try {
  init3D();
} catch (e) {
  console.error('3D initialization failed:', e);
  $('dropHintTitle').textContent = '3D preview unavailable';
  $('dropHintText').textContent = e.message || 'WebGL could not be initialized';
  setFooter('3D initialization failed', false);
}
