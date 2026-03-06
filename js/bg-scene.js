import * as THREE from 'three';

const canvas = document.getElementById('bg-canvas');
if (!canvas) throw new Error('Missing #bg-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

// Particle config
const COUNT = 260;
const LINK_DIST = 1.3;
const MOUSE_RADIUS = 1;
const MOUSE_PUSH = 0.004;
const SPREAD_X = 8;
const SPREAD_Y = 5;
const SPREAD_Z = 4;

// Dot texture
const dotCanvas = document.createElement('canvas');
dotCanvas.width = 32;
dotCanvas.height = 32;
const ctx = dotCanvas.getContext('2d');
const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, 32, 32);
const dotTexture = new THREE.CanvasTexture(dotCanvas);

// Create particles
const positions = new Float32Array(COUNT * 3);
const velocities = [];

for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD_X * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z * 2;
    velocities.push(
        (Math.random() - 0.5) * 0.0015,
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.0005
    );
}

const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const pointMat = new THREE.PointsMaterial({
    color: 0x00e5cc,
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    map: dotTexture,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});

scene.add(new THREE.Points(pointGeo, pointMat));
scene.fog = new THREE.Fog(0x0a0a0f, 5, 14);

// Lines between nearby particles
const MAX_LINES = COUNT * 6;
const linePositions = new Float32Array(MAX_LINES * 6);
const lineColors = new Float32Array(MAX_LINES * 6);

const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
lineGeo.setDrawRange(0, 0);

const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});

scene.add(new THREE.LineSegments(lineGeo, lineMat));

// Floating cube with contained particle network
const cubeGroup = new THREE.Group();
const CUBE_PARTICLES = 40;
const CUBE_LINK_DIST = 0.25;
const CUBE_MAX_LINES = CUBE_PARTICLES * 4;

// Floating blob — chaotic particle cluster
const BLOB_RADIUS = 0.35;

const cubePos = new Float32Array(CUBE_PARTICLES * 3);
const cubeVel = [];
for (let i = 0; i < CUBE_PARTICLES; i++) {
    // Spawn in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * BLOB_RADIUS;
    cubePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    cubePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    cubePos[i * 3 + 2] = r * Math.cos(phi);
    cubeVel.push(
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004
    );
}
const cubePointGeo = new THREE.BufferGeometry();
cubePointGeo.setAttribute('position', new THREE.BufferAttribute(cubePos, 3));
const cubePointMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    map: dotTexture,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});
cubeGroup.add(new THREE.Points(cubePointGeo, cubePointMat));

// Inner lines
const cubeLinePos = new Float32Array(CUBE_MAX_LINES * 6);
const cubeLineGeo = new THREE.BufferGeometry();
cubeLineGeo.setAttribute('position', new THREE.BufferAttribute(cubeLinePos, 3));
cubeLineGeo.setDrawRange(0, 0);
const cubeLineMat = new THREE.LineBasicMaterial({
    color: 0xffdd33,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
cubeGroup.add(new THREE.LineSegments(cubeLineGeo, cubeLineMat));

cubeGroup.position.set(0, 2, -1);
scene.add(cubeGroup);

const CUBE_DRIFT_SPEED = 0.003;

// Compute visible world bounds at z=0 for viewport wrapping
function getViewBounds(z) {
    const dist = camera.position.z - z;
    const vFov = (camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * dist;
    const w = h * camera.aspect;
    return { halfW: w / 2, halfH: h / 2 };
}

// Shooting stars
const STAR_COUNT = 3;
const shootingStars = [];

for (let i = 0; i < STAR_COUNT; i++) {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([0, 0, 0, -0.6, 0.3, 0]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
    });
    const line = new THREE.Line(geo, mat);
    line.position.set(0, 0, -2);
    scene.add(line);
    shootingStars.push({
        mesh: line,
        mat,
        active: false,
        timer: Math.random() * 500 + 200,
        cooldown: Math.random() * 500 + 200,
    });
}

// Mouse tracking (world space)
const mouse3D = new THREE.Vector3(9999, 9999, 0);
let scrollY = 0;

window.addEventListener('mousemove', (e) => {
    mouse3D.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse3D.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouse3D.z = 0;
    mouse3D.unproject(camera);
    const dir = mouse3D.clone().sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    mouse3D.copy(camera.position).add(dir.multiplyScalar(dist));
});

// Resize
function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
resize();
window.addEventListener('resize', resize);

function animate() {
    requestAnimationFrame(animate);

    const pos = pointGeo.attributes.position.array;

    // Move particles
    for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        pos[i3] += velocities[i3];
        pos[i3 + 1] += velocities[i3 + 1];
        pos[i3 + 2] += velocities[i3 + 2];

        // Wrap around
        if (pos[i3] > SPREAD_X) pos[i3] = -SPREAD_X;
        if (pos[i3] < -SPREAD_X) pos[i3] = SPREAD_X;
        if (pos[i3 + 1] > SPREAD_Y) pos[i3 + 1] = -SPREAD_Y;
        if (pos[i3 + 1] < -SPREAD_Y) pos[i3 + 1] = SPREAD_Y;
        if (pos[i3 + 2] > SPREAD_Z) pos[i3 + 2] = -SPREAD_Z;
        if (pos[i3 + 2] < -SPREAD_Z) pos[i3 + 2] = SPREAD_Z;

        // Push away from mouse
        const dx = pos[i3] - mouse3D.x;
        const dy = pos[i3 + 1] - mouse3D.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS && d > 0.01) {
            const force = (1 - d / MOUSE_RADIUS) * MOUSE_PUSH;
            pos[i3] += (dx / d) * force;
            pos[i3 + 1] += (dy / d) * force;
        }
    }
    pointGeo.attributes.position.needsUpdate = true;

    // Update lines
    let lineIdx = 0;
    const lp = lineGeo.attributes.position.array;
    const lc = lineGeo.attributes.color.array;

    for (let i = 0; i < COUNT; i++) {
        if (lineIdx >= MAX_LINES) break;
        const i3 = i * 3;
        for (let j = i + 1; j < COUNT; j++) {
            const j3 = j * 3;
            const dx = pos[i3] - pos[j3];
            const dy = pos[i3 + 1] - pos[j3 + 1];
            const dz = pos[i3 + 2] - pos[j3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < LINK_DIST) {
                const alpha = 1 - dist / LINK_DIST;
                const li = lineIdx * 6;
                lp[li] = pos[i3];
                lp[li + 1] = pos[i3 + 1];
                lp[li + 2] = pos[i3 + 2];
                lp[li + 3] = pos[j3];
                lp[li + 4] = pos[j3 + 1];
                lp[li + 5] = pos[j3 + 2];
                // Accent color fading with distance
                lc[li] = 0 * alpha;
                lc[li + 1] = 0.9 * alpha;
                lc[li + 2] = 0.8 * alpha;
                lc[li + 3] = 0 * alpha;
                lc[li + 4] = 0.9 * alpha;
                lc[li + 5] = 0.8 * alpha;
                lineIdx++;
                if (lineIdx >= MAX_LINES) break;
            }
        }
    }
    lineGeo.setDrawRange(0, lineIdx * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // Cube drift — viewport wrapping
    cubeGroup.position.x += CUBE_DRIFT_SPEED;
    cubeGroup.position.y -= CUBE_DRIFT_SPEED * 0.4;
    cubeGroup.rotation.y += 0.0012;
    cubeGroup.rotation.x += 0.0005;
    const vb = getViewBounds(cubeGroup.position.z);
    const margin = 0.5;
    if (cubeGroup.position.x > vb.halfW + margin) cubeGroup.position.x = -vb.halfW - margin;
    if (cubeGroup.position.x < -vb.halfW - margin) cubeGroup.position.x = vb.halfW + margin;
    if (cubeGroup.position.y > vb.halfH + margin) cubeGroup.position.y = -vb.halfH - margin;
    if (cubeGroup.position.y < -vb.halfH - margin) cubeGroup.position.y = vb.halfH + margin;

    // Animate blob particles — soft gravity toward center
    const cp = cubePointGeo.attributes.position.array;
    for (let i = 0; i < CUBE_PARTICLES; i++) {
        const i3 = i * 3;
        cp[i3] += cubeVel[i3];
        cp[i3 + 1] += cubeVel[i3 + 1];
        cp[i3 + 2] += cubeVel[i3 + 2];
        // Pull back toward center if too far
        const dist = Math.sqrt(cp[i3] * cp[i3] + cp[i3 + 1] * cp[i3 + 1] + cp[i3 + 2] * cp[i3 + 2]);
        if (dist > BLOB_RADIUS * 0.6) {
            const pull = (dist - BLOB_RADIUS * 0.6) * 0.005;
            cubeVel[i3] -= (cp[i3] / dist) * pull;
            cubeVel[i3 + 1] -= (cp[i3 + 1] / dist) * pull;
            cubeVel[i3 + 2] -= (cp[i3 + 2] / dist) * pull;
        }
        // Dampen + turbulence to keep steady speed
        cubeVel[i3] *= 0.995;
        cubeVel[i3 + 1] *= 0.995;
        cubeVel[i3 + 2] *= 0.995;
        cubeVel[i3] += (Math.random() - 0.5) * 0.0004;
        cubeVel[i3 + 1] += (Math.random() - 0.5) * 0.0004;
        cubeVel[i3 + 2] += (Math.random() - 0.5) * 0.0004;
    }
    cubePointGeo.attributes.position.needsUpdate = true;

    // Cube inner lines
    let cubeLineIdx = 0;
    const clp = cubeLineGeo.attributes.position.array;
    for (let i = 0; i < CUBE_PARTICLES && cubeLineIdx < CUBE_MAX_LINES; i++) {
        const i3 = i * 3;
        for (let j = i + 1; j < CUBE_PARTICLES; j++) {
            const j3 = j * 3;
            const dx = cp[i3] - cp[j3];
            const dy = cp[i3 + 1] - cp[j3 + 1];
            const dz = cp[i3 + 2] - cp[j3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < CUBE_LINK_DIST) {
                const li = cubeLineIdx * 6;
                clp[li] = cp[i3]; clp[li + 1] = cp[i3 + 1]; clp[li + 2] = cp[i3 + 2];
                clp[li + 3] = cp[j3]; clp[li + 4] = cp[j3 + 1]; clp[li + 5] = cp[j3 + 2];
                cubeLineIdx++;
                if (cubeLineIdx >= CUBE_MAX_LINES) break;
            }
        }
    }
    cubeLineGeo.setDrawRange(0, cubeLineIdx * 2);
    cubeLineGeo.attributes.position.needsUpdate = true;

    // Shooting stars
    for (const star of shootingStars) {
        if (!star.active) {
            star.cooldown--;
            if (star.cooldown <= 0) {
                star.active = true;
                star.timer = 60 + Math.random() * 40;
                star.mesh.position.set(
                    (Math.random() - 0.3) * SPREAD_X * 2,
                    (Math.random() * 0.5 + 0.3) * SPREAD_Y * 2,
                    -1 - Math.random() * 2
                );
                star.mat.opacity = 0.8;
            }
        } else {
            star.mesh.position.x += 0.12;
            star.mesh.position.y -= 0.06;
            star.timer--;
            star.mat.opacity = Math.max(0, star.timer / 60) * 0.8;
            if (star.timer <= 0) {
                star.active = false;
                star.mat.opacity = 0;
                star.cooldown = 300 + Math.random() * 600;
            }
        }
    }

    // Subtle camera sway based on scroll
    camera.position.y = -scrollY * 0.001;

    renderer.render(scene, camera);
}

requestAnimationFrame(animate);

export function setScrollY(y) {
    scrollY = y;
}
