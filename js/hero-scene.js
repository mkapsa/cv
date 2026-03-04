import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const canvas = document.getElementById('hero-canvas');
if (!canvas) throw new Error('Missing #hero-canvas');

const width = canvas.clientWidth || 500;
const height = canvas.clientHeight || 600;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0a0f, 2.5, 4.5);
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
camera.position.set(0, 0, 3);

// Circular dot texture
const dotCanvas = document.createElement('canvas');
dotCanvas.width = 64;
dotCanvas.height = 64;
const ctx = dotCanvas.getContext('2d');
const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, 64, 64);
const dotTexture = new THREE.CanvasTexture(dotCanvas);

let model = null;
let paused = false;
let mergedVertsRef = null;
let basePositions = null;
let vertexPhases = null;
let edgePairs = null;
let pointGeoRef = null;
let lineGeoRef = null;
let displacements = null;

// Mouse lines — dynamic lines from cursor to nearby vertices
const MAX_MOUSE_LINES = 8;
const MOUSE_RADIUS = 0.5;
const mouseLinePositions = new Float32Array(MAX_MOUSE_LINES * 6);
const mouseLineGeo = new LineSegmentsGeometry();
const mouseLineMat = new LineMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.9,
    linewidth: 1.3,
    resolution: new THREE.Vector2(width, height),
});
const mouseLines = new LineSegments2(mouseLineGeo, mouseLineMat);
mouseLines.visible = false;
scene.add(mouseLines);

// Mouse cursor dot
const cursorGeo = new THREE.BufferGeometry();
cursorGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
const cursorMat = new THREE.PointsMaterial({
    color: 0xffe640,
    size: 0.025,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    map: dotTexture,
    depthWrite: false,
});
const cursorDot = new THREE.Points(cursorGeo, cursorMat);
scene.add(cursorDot);

// Mouse tracking
const mouse = new THREE.Vector2(9999, 9999);
let mouseInCanvas = false;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouseInCanvas = true;
});

canvas.addEventListener('mouseleave', () => {
    mouseInCanvas = false;
});

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(
    'model/bust.glb',
    (gltf) => {
        gltf.scene.rotation.z = Math.PI / 2;
        gltf.scene.updateMatrixWorld(true);
        buildNodeMesh(gltf.scene);
    },
    undefined,
    () => {
        const geo = new THREE.IcosahedronGeometry(1, 1);
        const tempMesh = new THREE.Mesh(geo);
        const tempScene = new THREE.Group();
        tempScene.add(tempMesh);
        buildNodeMesh(tempScene);
    }
);

function buildNodeMesh(sourceScene) {
    const rawVerts = [];

    sourceScene.traverse((child) => {
        if (!child.isMesh) return;
        const pos = child.geometry.attributes.position;
        child.updateWorldMatrix(true, false);
        for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            v.applyMatrix4(child.matrixWorld);
            rawVerts.push(v);
        }
    });

    if (rawVerts.length === 0) return;

    const bbox = new THREE.Box3();
    for (const v of rawVerts) bbox.expandByPoint(v);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 2.2 / maxDim;
    for (const v of rawVerts) v.sub(center).multiplyScalar(s);

    // Grid-based vertex clustering
    const gridSize = 0.20;
    const cellMap = new Map();
    const vertToCell = [];

    for (let i = 0; i < rawVerts.length; i++) {
        const v = rawVerts[i];
        const cx = Math.round(v.x / gridSize);
        const cy = Math.round(v.y / gridSize);
        const cz = Math.round(v.z / gridSize);
        const key = `${cx},${cy},${cz}`;
        vertToCell.push(key);

        if (!cellMap.has(key)) {
            cellMap.set(key, { sum: new THREE.Vector3(), count: 0 });
        }
        const cell = cellMap.get(key);
        cell.sum.add(v);
        cell.count++;
    }

    const mergedVerts = [];
    const cellToIndex = new Map();
    let idx = 0;
    for (const [key, cell] of cellMap) {
        mergedVerts.push(cell.sum.clone().divideScalar(cell.count));
        cellToIndex.set(key, idx++);
    }

    mergedVertsRef = mergedVerts;

    // Rebuild edges
    const allIndices = [];
    let vertexOffset = 0;
    sourceScene.traverse((child) => {
        if (!child.isMesh) return;
        const geo = child.geometry;
        const index = geo.index;
        const count = geo.attributes.position.count;
        if (index) {
            for (let i = 0; i < index.count; i++) {
                allIndices.push(index.getX(i) + vertexOffset);
            }
        } else {
            for (let i = 0; i < count; i++) {
                allIndices.push(i + vertexOffset);
            }
        }
        vertexOffset += count;
    });

    const edgeSet = new Set();
    const edgePositions = [];
    const edges = [];

    for (let i = 0; i < allIndices.length; i += 3) {
        if (i + 2 >= allIndices.length) break;
        const ia = cellToIndex.get(vertToCell[allIndices[i]]);
        const ib = cellToIndex.get(vertToCell[allIndices[i + 1]]);
        const ic = cellToIndex.get(vertToCell[allIndices[i + 2]]);
        if (ia !== ib) addEdge(ia, ib);
        if (ib !== ic) addEdge(ib, ic);
        if (ic !== ia) addEdge(ic, ia);
    }

    function addEdge(a, b) {
        const key = Math.min(a, b) + ':' + Math.max(a, b);
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push([a, b]);
        const va = mergedVerts[a], vb = mergedVerts[b];
        edgePositions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
    }

    edgePairs = edges;

    const group = new THREE.Group();

    // Wireframe edges
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x00e5cc,
        transparent: true,
        opacity: 0.4,
    });
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    // Vertex nodes
    const pointArr = new Float32Array(mergedVerts.length * 3);
    for (let i = 0; i < mergedVerts.length; i++) {
        pointArr[i * 3] = mergedVerts[i].x;
        pointArr[i * 3 + 1] = mergedVerts[i].y;
        pointArr[i * 3 + 2] = mergedVerts[i].z;
    }
    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointArr, 3));
    const pointMat = new THREE.PointsMaterial({
        color: 0x00e5cc,
        size: 0.04,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        map: dotTexture,
        depthWrite: false,
    });
    group.add(new THREE.Points(pointGeo, pointMat));

    // Store base positions and random phases for vertex animation
    basePositions = mergedVerts.map(v => v.clone());
    vertexPhases = mergedVerts.map(() => ({
        px: Math.random() * Math.PI * 2,
        py: Math.random() * Math.PI * 2,
        pz: Math.random() * Math.PI * 2,
        sx: 0.3 + Math.random() * 0.4,
        sy: 0.3 + Math.random() * 0.4,
        sz: 0.3 + Math.random() * 0.4,
    }));
    pointGeoRef = pointGeo;
    lineGeoRef = lineGeo;
    displacements = mergedVerts.map(() => new THREE.Vector3());

    model = group;
    scene.add(model);
}

// Get mouse position in model-local space
function getMouseInModelSpace() {
    const tempVec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    tempVec.unproject(camera);
    const dir = tempVec.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    const worldMouse = camera.position.clone().add(dir.multiplyScalar(dist));

    if (model) {
        const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
        worldMouse.applyMatrix4(inv);
    }
    return worldMouse;
}

function updateMouseLines() {
    if (!mergedVertsRef || !mouseInCanvas || !model) {
        mouseLines.visible = false;
        cursorMat.opacity = 0;
        return;
    }

    const mousePos = getMouseInModelSpace();

    const nearby = [];
    for (let i = 0; i < mergedVertsRef.length; i++) {
        const d = mergedVertsRef[i].distanceTo(mousePos);
        if (d < MOUSE_RADIUS) {
            nearby.push({ idx: i, dist: d });
        }
    }
    nearby.sort((a, b) => a.dist - b.dist);

    const count = Math.min(nearby.length, MAX_MOUSE_LINES);

    if (count > 0) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const v = mergedVertsRef[nearby[i].idx];
            positions.push(mousePos.x, mousePos.y, mousePos.z, v.x, v.y, v.z);
        }
        mouseLineGeo.setPositions(positions);
        mouseLines.visible = true;
        mouseLineMat.opacity = 0.3 + 0.5 * (1 - nearby[0].dist / MOUSE_RADIUS);
    } else {
        mouseLines.visible = false;
    }

    const cursorPos = cursorGeo.attributes.position;
    cursorPos.array[0] = mousePos.x;
    cursorPos.array[1] = mousePos.y;
    cursorPos.array[2] = mousePos.z;
    cursorPos.needsUpdate = true;
    cursorMat.opacity = count > 0 ? 0.8 : 0;

    mouseLines.matrix.copy(model.matrixWorld);
    mouseLines.matrixAutoUpdate = false;
    cursorDot.matrix.copy(model.matrixWorld);
    cursorDot.matrixAutoUpdate = false;
}

const DRIFT_AMP = 0.01;
const PUSH_STRENGTH = 0.004;
const PUSH_RADIUS = 0.35;
const SPRING_BACK = 0.04;

function animate() {
    if (!paused && model) {
        model.rotation.y += 0.00012;
    }

    // Push nodes away from cursor
    if (displacements && mouseInCanvas && model) {
        const mousePos = getMouseInModelSpace();
        for (let i = 0; i < displacements.length; i++) {
            const bp = basePositions[i];
            const dx = bp.x - mousePos.x;
            const dy = bp.y - mousePos.y;
            const dz = bp.z - mousePos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < PUSH_RADIUS && dist > 0.001) {
                const force = (1 - dist / PUSH_RADIUS) * PUSH_STRENGTH;
                displacements[i].x += (dx / dist) * force;
                displacements[i].y += (dy / dist) * force;
                displacements[i].z += (dz / dist) * force;
            }
        }
    }

    // Spring back
    if (displacements) {
        for (let i = 0; i < displacements.length; i++) {
            displacements[i].multiplyScalar(1 - SPRING_BACK);
        }
    }

    // Animate vertex positions
    if (basePositions && !paused) {
        const t = performance.now() * 0.001;
        const pointPos = pointGeoRef.attributes.position;
        const linePos = lineGeoRef.attributes.position;

        for (let i = 0; i < basePositions.length; i++) {
            const bp = basePositions[i];
            const ph = vertexPhases[i];
            const dx = Math.sin(t * ph.sx + ph.px) * DRIFT_AMP;
            const dy = Math.sin(t * ph.sy + ph.py) * DRIFT_AMP;
            const dz = Math.sin(t * ph.sz + ph.pz) * DRIFT_AMP;
            const d = displacements ? displacements[i] : null;
            mergedVertsRef[i].x = bp.x + dx + (d ? d.x : 0);
            mergedVertsRef[i].y = bp.y + dy + (d ? d.y : 0);
            mergedVertsRef[i].z = bp.z + dz + (d ? d.z : 0);
            pointPos.array[i * 3] = mergedVertsRef[i].x;
            pointPos.array[i * 3 + 1] = mergedVertsRef[i].y;
            pointPos.array[i * 3 + 2] = mergedVertsRef[i].z;
        }
        pointPos.needsUpdate = true;

        for (let i = 0; i < edgePairs.length; i++) {
            const [a, b] = edgePairs[i];
            const va = mergedVertsRef[a], vb = mergedVertsRef[b];
            linePos.array[i * 6] = va.x;
            linePos.array[i * 6 + 1] = va.y;
            linePos.array[i * 6 + 2] = va.z;
            linePos.array[i * 6 + 3] = vb.x;
            linePos.array[i * 6 + 4] = vb.y;
            linePos.array[i * 6 + 5] = vb.z;
        }
        linePos.needsUpdate = true;
    }

    updateMouseLines();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

export function setPaused(p) {
    paused = p;
}
