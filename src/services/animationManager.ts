interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

const PALETTE_COLORS = ['#D65D43', '#D6AA57', '#87977A', '#252820'];

export class AnimationManager {
  private particles: Particle[] = [];
  private rafId: number | null = null;

  public spawnBurst(
    canvas: HTMLCanvasElement | null,
    reducedMotion: boolean,
    colorBias?: string
  ): void {
    if (!canvas || reducedMotion) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width);
    canvas.height = Math.max(1, rect.height);

    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.45;
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.3;
      const speed = 2.2 + Math.random() * 4.8;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 4 + Math.random() * 5,
        color:
          colorBias && i % 2 === 0
            ? colorBias
            : PALETTE_COLORS[i % PALETTE_COLORS.length],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.015,
      });
    }

    if (!this.rafId) {
      this.loop(canvas);
    }
  }

  private loop(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particles = this.particles.filter((p) => p.alpha > 0.02);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14;
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(() => this.loop(canvas));
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.rafId = null;
    }
  }

  public stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.particles = [];
  }
}

export const animationManager = new AnimationManager();
