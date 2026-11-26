import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CategoryWheel } from './wheel';
import { Confetti, Fireworks, sparkTexture } from './effects';

export type StageMode = 'idle' | 'wheel' | 'question' | 'results';
export type Quality = 'auto' | 'high' | 'low';

const WHEEL_POS = new THREE.Vector3(0, 3.4, 0);
const FOV = 50;

/** The 3D game-show stage that sits behind every screen. */
export class Stage {
  readonly wheel = new CategoryWheel();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private readonly clock = new THREE.Timer();
  private readonly gem = new THREE.Group();
  private gemScale = 0;

  private readonly confetti = new Confetti();
  private readonly fireworks = new Fireworks();
  private readonly grid: THREE.GridHelper;
  private readonly rings: THREE.Mesh[] = [];
  private readonly arcs: THREE.Mesh[] = [];
  private readonly beams: THREE.Mesh[] = [];
  private readonly dust: THREE.Points;
  private readonly spotA: THREE.SpotLight;
  private readonly spotB: THREE.SpotLight;
  private readonly key: THREE.PointLight;

  private mode: StageMode = 'idle';
  private quality: Quality;
  private effectiveQuality: 'high' | 'low' = 'high';
  private tension = 0;
  private shake = 0;
  private time = 0;
  private fireworkTimer = 0;
  private readonly accent = new THREE.Color('#38e1ff');
  private readonly accentTarget = new THREE.Color('#38e1ff');
  private readonly camPos = new THREE.Vector3(0, 5, 14);
  private readonly camLook = new THREE.Vector3(0, 2, 0);
  private wheelScale = 0.8;
  private fps = { frames: 0, elapsed: 0, checked: false };

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color(0x07061a);
    this.scene.fog = new THREE.FogExp2(0x07061a, 0.022);

    // Lighting: dim fill plus coloured spotlights that sweep the stage.
    this.scene.add(new THREE.HemisphereLight(0x6f5cff, 0x0a0518, 0.6));
    this.spotA = this.makeSpot(0xff2d95, -7);
    this.spotB = this.makeSpot(0x38e1ff, 7);
    this.key = new THREE.PointLight(0xffffff, 30, 30, 2);
    this.key.position.set(0, 7, 6);
    this.scene.add(this.key);

    // Neon floor grid.
    this.grid = new THREE.GridHelper(120, 60, 0xff2d95, 0x3a1d8a);
    const gm = this.grid.material as THREE.Material;
    gm.transparent = true;
    gm.opacity = 0.45;
    this.scene.add(this.grid);

    // Stage platform with glowing rims.
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 5.3, 0.6, 72),
      new THREE.MeshStandardMaterial({ color: 0x120c2c, metalness: 0.85, roughness: 0.3 }),
    );
    platform.position.y = 0.3;
    this.scene.add(platform);
    [5.05, 4.2, 3.2].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, i === 0 ? 0.07 : 0.035, 12, 128),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xff2d95 : 0x38e1ff, toneMapped: false }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = i === 0 ? 0.6 : 0.62;
      this.rings.push(ring);
      this.scene.add(ring);
    });

    // Big neon arches behind the stage.
    for (let i = 0; i < 4; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(6 + i * 1.6, 0.06, 8, 160, Math.PI),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xb46bff : 0x38e1ff, toneMapped: false, transparent: true }),
      );
      arc.position.set(0, 0, -6 - i * 2.2);
      this.arcs.push(arc);
      this.scene.add(arc);
    }

    // Volumetric-looking light beams from above.
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 14, 32, 1, true),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xff2d95 : 0x38e1ff,
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      beam.position.set(-6 + i * 4, 8, -3);
      this.beams.push(beam);
      this.scene.add(beam);
    }

    // Floating dust motes.
    const n = 500;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 40, Math.random() * 16, (Math.random() - 0.5) * 30 - 4], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(
      dg,
      new THREE.PointsMaterial({
        size: 0.09,
        map: sparkTexture(),
        color: 0x9fb4ff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);

    // Spinning crystal that floats above the stage during questions and reacts to the timer.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x38e1ff, emissive: 0x38e1ff, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.15, flatShading: true }),
    );
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.45, 1),
      new THREE.MeshBasicMaterial({ color: 0x38e1ff, wireframe: true, transparent: true, opacity: 0.55, toneMapped: false }),
    );
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff2d95, toneMapped: false }));
    this.gem.add(core, shell, halo);
    this.gem.position.set(0, 5.3, 0);
    this.gem.scale.setScalar(0.001);
    this.scene.add(this.gem);

    this.wheel.group.position.copy(WHEEL_POS);
    this.scene.add(this.wheel.group);
    this.scene.add(this.confetti.mesh);
    this.scene.add(this.fireworks.points);

    this.applyQuality(quality === 'low' ? 'low' : 'high');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setQuality(q: Quality): void {
    this.quality = q;
    this.fps = { frames: 0, elapsed: 0, checked: q !== 'auto' };
    this.applyQuality(q === 'low' ? 'low' : 'high');
  }

  setMode(mode: StageMode): void {
    this.mode = mode;
    if (mode !== 'question') this.tension = 0;
  }

  setAccent(hex: string): void {
    this.accentTarget.set(hex);
  }

  /** 0..1, how close the timer is to running out. */
  setTension(t: number): void {
    this.tension = t;
  }

  celebrate(): void {
    this.confetti.burst(new THREE.Vector3(0, 3, 2), this.effectiveQuality === 'high' ? 200 : 90);
    this.fireworks.burst(new THREE.Vector3(-3, 6, -2));
    this.fireworks.burst(new THREE.Vector3(3, 6.5, -2));
    this.shake = 0.15;
  }

  fail(): void {
    this.shake = 0.55;
  }

  bigCelebrate(): void {
    this.confetti.burst(new THREE.Vector3(0, 2, 2), 320, 1.3);
    this.fireworkTimer = 0;
  }

  private makeSpot(color: number, x: number): THREE.SpotLight {
    const s = new THREE.SpotLight(color, 220, 40, Math.PI / 7, 0.5, 1.6);
    s.position.set(x, 12, 4);
    s.target.position.set(0, 0, 0);
    this.scene.add(s, s.target);
    return s;
  }

  private applyQuality(q: 'high' | 'low'): void {
    this.effectiveQuality = q;
    this.renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1));
    if (q === 'high') {
      if (!this.composer) {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.2);
        this.composer.addPass(this.bloom);
        this.composer.addPass(new OutputPass());
      }
    } else {
      this.composer?.dispose();
      this.composer = null;
      this.bloom = null;
    }
    this.dust.visible = q === 'high';
    this.beams.forEach((b) => (b.visible = q === 'high'));
    this.resize();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
  }

  /** Distance needed for the wheel to fit the narrow side of the screen. */
  private wheelDistance(): number {
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return Math.max(3.4 / half, 3.4 / (half * this.camera.aspect));
  }

  private frame(): void {
    this.clock.update();
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);
    this.time += dt;
    this.autoQuality(raw);

    // Camera choreography per mode.
    const t = this.time;
    const portrait = this.camera.aspect < 1;
    let wheelTarget = 0;
    switch (this.mode) {
      case 'idle': {
        const r = portrait ? 17 : 13;
        this.camPos.set(Math.sin(t * 0.12) * r, 5.5 + Math.sin(t * 0.3) * 0.6, Math.cos(t * 0.12) * r);
        this.camLook.set(0, 2.6, 0);
        wheelTarget = 0.8;
        break;
      }
      case 'wheel': {
        const d = this.wheelDistance();
        this.camPos.set(Math.sin(t * 0.4) * 0.4, WHEEL_POS.y + 0.2, d);
        this.camLook.copy(WHEEL_POS);
        wheelTarget = 1;
        break;
      }
      case 'question': {
        const r = portrait ? 15 : 11;
        this.camPos.set(Math.sin(t * 0.15) * 2, 4 + this.tension * -0.8, r - this.tension * 2.5);
        this.camLook.set(0, 2.2, 0);
        break;
      }
      case 'results': {
        const r = portrait ? 16 : 12;
        this.camPos.set(Math.sin(t * 0.2) * r, 3.5, Math.cos(t * 0.2) * r);
        this.camLook.set(0, 3, 0);
        this.fireworkTimer -= dt;
        if (this.fireworkTimer <= 0) {
          this.fireworkTimer = 0.45 + Math.random() * 0.5;
          this.fireworks.burst(new THREE.Vector3((Math.random() - 0.5) * 12, 5 + Math.random() * 5, -4 - Math.random() * 6));
          this.onFirework?.();
        }
        break;
      }
    }
    const k = Math.min(1, dt * 2.2);
    this.camera.position.lerp(this.camPos, k);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.6);
    }
    this.camera.lookAt(this.camLook);

    this.wheelScale += (wheelTarget - this.wheelScale) * Math.min(1, dt * 5);
    this.wheel.group.scale.setScalar(Math.max(0.001, this.wheelScale));
    this.wheel.group.visible = this.wheelScale > 0.01;
    this.wheel.update(dt);

    this.gemScale += ((this.mode === 'question' ? 1 : 0) - this.gemScale) * Math.min(1, dt * 4);
    this.gem.visible = this.gemScale > 0.01;
    if (this.gem.visible) {
      const pulse = 1 + Math.sin(t * (3 + this.tension * 14)) * (0.03 + this.tension * 0.06);
      this.gem.scale.setScalar(Math.max(0.001, this.gemScale * pulse * 0.75));
      const [core, shell, halo] = this.gem.children as THREE.Mesh[];
      core.rotation.set(t * 0.6, t * (0.8 + this.tension * 3), 0);
      shell.rotation.set(-t * 0.3, -t * 0.4, t * 0.2);
      halo.rotation.set(Math.PI / 2 + Math.sin(t) * 0.3, 0, t);
      this.gem.position.y = 5.3 + Math.sin(t * 1.3) * 0.25;
    }

    // Lights and neon react to the accent colour and the timer.
    this.accent.lerp(this.accentTarget, Math.min(1, dt * 3));
    const danger = new THREE.Color(0xff2a2a);
    const glow = this.accent.clone().lerp(danger, this.tension * 0.85);
    const speed = 0.6 + this.tension * 2.5;
    this.spotA.position.x = -7 + Math.sin(t * speed) * 4;
    this.spotB.position.x = 7 + Math.cos(t * speed * 1.1) * 4;
    this.spotB.color.copy(glow);
    (this.rings[0].material as THREE.MeshBasicMaterial).color.copy(glow).multiplyScalar(1.5);
    (this.rings[2].material as THREE.MeshBasicMaterial).color.copy(glow);
    this.arcs.forEach((a, i) => {
      const m = a.material as THREE.MeshBasicMaterial;
      m.opacity = 0.45 + 0.55 * Math.max(0, Math.sin(t * (1.5 + this.tension * 6) - i * 0.9));
      if (i % 2 === 0) m.color.copy(glow);
    });
    if (this.gem.visible) {
      const [core, shell] = this.gem.children as THREE.Mesh[];
      const cm = core.material as THREE.MeshStandardMaterial;
      cm.color.copy(glow);
      cm.emissive.copy(glow);
      (shell.material as THREE.MeshBasicMaterial).color.copy(glow);
    }
    this.beams.forEach((b, i) => {
      b.rotation.z = Math.sin(t * speed * 0.7 + i) * 0.45;
      (b.material as THREE.MeshBasicMaterial).color.copy(i % 2 ? new THREE.Color(0xff2d95) : glow);
    });
    this.grid.position.z = (t * (1.2 + this.tension * 4)) % 2;
    this.dust.rotation.y = t * 0.02;
    if (this.bloom) this.bloom.strength = 0.8 + this.tension * 0.5;

    this.confetti.update(dt);
    this.fireworks.update(dt);

    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  /** In auto mode, drop to low quality if the phone can't hold a smooth frame rate. */
  private autoQuality(dt: number): void {
    if (this.quality !== 'auto' || this.fps.checked) return;
    this.fps.frames += 1;
    this.fps.elapsed += dt;
    if (this.fps.elapsed > 3) {
      this.fps.checked = true;
      const avg = this.fps.frames / this.fps.elapsed;
      if (avg < 40 && this.effectiveQuality === 'high') this.applyQuality('low');
    }
  }

  onFirework?: () => void;
}
