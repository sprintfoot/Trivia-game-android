import * as THREE from 'three';

const PALETTE = [0xff4fa3, 0x38e1ff, 0xffcc33, 0x7cf03d, 0xb46bff, 0xff8a3d, 0xffffff];

/** Spinning paper confetti, drawn as one instanced mesh. */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private readonly pos: THREE.Vector3[] = [];
  private readonly vel: THREE.Vector3[] = [];
  private readonly rot: THREE.Euler[] = [];
  private readonly spin: THREE.Vector3[] = [];
  private readonly life: number[] = [];
  private readonly dummy = new THREE.Object3D();
  private next = 0;

  constructor(private readonly count = 360) {
    const geo = new THREE.PlaneGeometry(0.09, 0.16);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.pos.push(new THREE.Vector3(0, -100, 0));
      this.vel.push(new THREE.Vector3());
      this.rot.push(new THREE.Euler());
      this.spin.push(new THREE.Vector3());
      this.life.push(0);
      this.mesh.setColorAt(i, color.setHex(PALETTE[i % PALETTE.length]).multiplyScalar(1.6));
    }
    this.sync();
  }

  burst(origin: THREE.Vector3, amount = 180, power = 1): void {
    for (let k = 0; k < amount; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const up = 0.5 + Math.random() * 0.8;
      const sp = (3 + Math.random() * 5) * power;
      this.pos[i].copy(origin);
      this.vel[i].set(Math.cos(a) * sp * 0.7, up * sp, Math.sin(a) * sp * 0.5 + 1.2);
      this.rot[i].set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.spin[i].set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
      this.life[i] = 3 + Math.random() * 1.5;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const v = this.vel[i];
      v.y -= 9 * dt;
      v.multiplyScalar(1 - 1.8 * dt); // air drag, so pieces flutter down
      v.x += Math.sin(this.life[i] * 6 + i) * 0.6 * dt;
      this.pos[i].addScaledVector(v, dt);
      this.rot[i].x += this.spin[i].x * dt;
      this.rot[i].y += this.spin[i].y * dt;
      this.rot[i].z += this.spin[i].z * dt;
      if (this.life[i] <= 0) this.pos[i].set(0, -100, 0);
    }
    this.sync();
  }

  private sync(): void {
    for (let i = 0; i < this.count; i++) {
      this.dummy.position.copy(this.pos[i]);
      this.dummy.rotation.copy(this.rot[i]);
      const s = this.life[i] > 0 ? Math.min(1, this.life[i]) : 0;
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Glowing firework bursts built from additive point sprites. */
export class Fireworks {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly base: Float32Array;
  private next = 0;

  constructor(private readonly count = 1600) {
    this.positions = new Float32Array(count * 3).fill(-100);
    this.colors = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: sparkTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  burst(origin: THREE.Vector3, hex = PALETTE[Math.floor(Math.random() * PALETTE.length)], amount = 160): void {
    const c = new THREE.Color(hex).multiplyScalar(2.2);
    for (let k = 0; k < amount; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      // Uniform point on a sphere for a round burst.
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const sp = 3.5 + Math.random() * 1.2;
      this.vel.set([r * Math.cos(th) * sp, u * sp, r * Math.sin(th) * sp], i * 3);
      this.positions.set([origin.x, origin.y, origin.z], i * 3);
      this.base.set([c.r, c.g, c.b], i * 3);
      this.life[i] = 1.4 + Math.random() * 0.6;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      this.vel[j + 1] -= 3 * dt;
      for (let a = 0; a < 3; a++) {
        this.vel[j + a] *= 1 - 1.6 * dt;
        this.positions[j + a] += this.vel[j + a] * dt;
      }
      const fade = Math.max(0, Math.min(1, this.life[i] / 1.2));
      const twinkle = 0.7 + Math.random() * 0.3;
      for (let a = 0; a < 3; a++) this.colors[j + a] = this.base[j + a] * fade * twinkle;
      if (this.life[i] <= 0) this.positions[j + 1] = -100;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

export function sparkTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
