import * as THREE from 'three';
import type { Category, CategoryId } from '../game/categories';

const RADIUS = 2.6;
const DEPTH = 0.35;
const TAU = Math.PI * 2;

function labelTexture(cat: Category): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 64;
  const text = cat.name.toUpperCase();
  do {
    g.font = `900 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > 470 && size > 20);
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(0,0,0,0.65)';
  g.strokeText(text, 256, 66);
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A 3D prize-style wheel with one glowing segment per category. */
export class CategoryWheel {
  readonly group = new THREE.Group();
  private readonly spinner = new THREE.Group();
  private readonly bulbs: THREE.Mesh[] = [];
  private readonly pointer: THREE.Mesh;
  private segmentMeshes: THREE.Mesh[] = [];
  private categories: Category[] = [];
  private angle = 0;
  private velocityHint = 0;
  private spin: {
    from: number;
    to: number;
    start: number;
    duration: number;
    resolve: () => void;
    onTick: (speed: number) => void;
    lastSegment: number;
  } | null = null;
  private time = 0;
  private winner = -1;

  constructor() {
    // Cylinder's axis is Y; tilt so the face points at the camera (+Z).
    const tilt = new THREE.Group();
    tilt.rotation.x = Math.PI / 2;
    tilt.add(this.spinner);
    this.group.add(tilt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS + 0.12, 0.14, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x1b1640, metalness: 0.9, roughness: 0.25, emissive: 0x2a1060 }),
    );
    rim.position.z = 0;
    this.group.add(rim);

    const bulbGeo = new THREE.SphereGeometry(0.07, 12, 8);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
      bulb.position.set(Math.cos(a) * (RADIUS + 0.12), Math.sin(a) * (RADIUS + 0.12), 0.16);
      this.bulbs.push(bulb);
      this.group.add(bulb);
    }

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, DEPTH + 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15, emissive: 0x332266 }),
    );
    hub.rotation.x = Math.PI / 2;
    this.group.add(hub);
    const hubGlow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: 0x38e1ff }));
    hubGlow.position.z = DEPTH / 2 + 0.11;
    this.group.add(hubGlow);

    this.pointer = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.6, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff2d95, emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.3 }),
    );
    this.pointer.rotation.z = Math.PI;
    this.pointer.position.set(0, RADIUS + 0.45, 0.3);
    this.group.add(this.pointer);
    this.disableFog();
  }

  /** The wheel is the hero of its screen: keep it crisp rather than fogged like the backdrop. */
  private disableFog(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.MeshStandardMaterial).fog = false;
    });
  }

  build(categories: readonly Category[]): void {
    for (const m of this.segmentMeshes) {
      this.spinner.remove(m);
      m.geometry.dispose();
    }
    this.spinner.clear();
    this.segmentMeshes = [];
    this.categories = categories.slice();
    this.winner = -1;

    const n = Math.max(categories.length, 1);
    // With few categories, repeat them round the wheel so it still looks like a wheel.
    const repeats = n >= 6 ? 1 : Math.ceil(6 / n);
    const total = n * repeats;
    const seg = TAU / total;

    for (let i = 0; i < total; i++) {
      const cat = categories[i % n];
      const color = new THREE.Color(cat.color);
      const mat = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.75),
        emissive: color,
        emissiveIntensity: 0.25,
        metalness: 0.35,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, DEPTH, 24, 1, false, i * seg + 0.012, seg - 0.024), mat);
      mesh.userData.index = i;
      this.spinner.add(mesh);
      this.segmentMeshes.push(mesh);

      const holder = new THREE.Group();
      holder.rotation.y = i * seg + seg / 2;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.85, 0.46),
        new THREE.MeshBasicMaterial({ map: labelTexture(cat), transparent: true, depthWrite: false }),
      );
      label.position.set(0, DEPTH / 2 + 0.01, RADIUS * 0.6);
      label.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      holder.add(label);
      this.spinner.add(holder);
    }
    this.disableFog();
  }

  private get segmentCount(): number {
    return this.segmentMeshes.length;
  }

  private segmentAtPointer(angle: number): number {
    const seg = TAU / this.segmentCount;
    const local = (((Math.PI - angle) % TAU) + TAU) % TAU;
    return Math.floor(local / seg);
  }

  /** Spin and land on the given category. onTick fires each time a peg passes the pointer. */
  spinTo(id: CategoryId, onTick: (speed: number) => void, duration = 4.2): Promise<void> {
    const n = this.categories.length;
    const segCount = this.segmentCount;
    const seg = TAU / segCount;
    const matches: number[] = [];
    for (let i = 0; i < segCount; i++) if (this.categories[i % n].id === id) matches.push(i);
    const target = matches[Math.floor(Math.random() * matches.length)];
    const mid = target * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;

    let to = Math.PI - mid - jitter;
    const minTo = this.angle + TAU * 5;
    while (to < minTo) to += TAU;
    this.winner = -1;

    return new Promise((resolve) => {
      this.spin = {
        from: this.angle,
        to,
        start: this.time,
        duration,
        resolve: () => {
          this.winner = target;
          resolve();
        },
        onTick,
        lastSegment: this.segmentAtPointer(this.angle),
      };
    });
  }

  /** Gentle idle drift so the wheel never looks frozen. */
  update(dt: number): void {
    this.time += dt;
    if (this.spin) {
      const s = this.spin;
      const p = Math.min(1, (this.time - s.start) / s.duration);
      // Fast start, long suspenseful slow-down with a tiny overshoot settle.
      const eased = 1 - Math.pow(1 - p, 4);
      const prev = this.angle;
      this.angle = s.from + (s.to - s.from) * eased;
      this.velocityHint = (this.angle - prev) / Math.max(dt, 1e-3);
      const segNow = this.segmentAtPointer(this.angle);
      if (segNow !== s.lastSegment) {
        s.lastSegment = segNow;
        s.onTick(Math.min(1, this.velocityHint / 12));
        this.pointer.rotation.z = Math.PI + 0.35;
      }
      if (p >= 1) {
        this.spin = null;
        this.velocityHint = 0;
        s.resolve();
      }
    } else if (this.winner < 0) {
      this.angle += dt * 0.15;
    }
    this.spinner.rotation.y = this.angle;
    this.pointer.rotation.z += (Math.PI - this.pointer.rotation.z) * Math.min(1, dt * 14);

    // Chasing bulbs; all flash together once the wheel lands.
    this.bulbs.forEach((b, i) => {
      const mat = b.material as THREE.MeshBasicMaterial;
      const on = this.winner >= 0 ? Math.sin(this.time * 18) > 0 : (Math.floor(this.time * 10) + i) % 3 === 0;
      mat.color.setHex(on ? 0xfff2b0 : 0x3a2f55);
    });

    this.segmentMeshes.forEach((m, i) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      const target = this.winner < 0 ? 0.25 : i === this.winner ? 1.4 + Math.sin(this.time * 12) * 0.4 : 0.05;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * Math.min(1, dt * 8);
    });
  }
}
