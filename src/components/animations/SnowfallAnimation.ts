import { BaseAnimation } from './BaseAnimation';

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  windOffset: number;
  windPhase: number;
  opacity: number;
}

export class SnowfallAnimation extends BaseAnimation {
  private snowflakes: Snowflake[] = [];
  private wind = { speed: 0, target: 0 };
  private windTimeout: NodeJS.Timeout | undefined;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initializeSnowflakes();
    this.updateWind();
  }

  private initializeSnowflakes(): void {
    const snowflakeCount = Math.floor((window.innerWidth * window.innerHeight) / 15000);
    for (let i = 0; i < snowflakeCount; i++) {
      this.snowflakes.push(this.createSnowflake());
    }
  }

  private createSnowflake(): Snowflake {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 3 + 1,
      speed: 1 + Math.random() * 2,
      windOffset: Math.random() * 2 - 1,
      windPhase: Math.random() * Math.PI * 2,
      opacity: 0.4 + Math.random() * 0.6
    };
  }

  private updateWind(): void {
    const updateWindSpeed = () => {
      this.wind.target = (Math.random() - 0.5) * 2;
      this.wind.speed += (this.wind.target - this.wind.speed) * 0.01;
      this.windTimeout = setTimeout(updateWindSpeed, 2000);
    };
    updateWindSpeed();
  }

  animate(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.snowflakes.forEach(snowflake => {
      snowflake.y += snowflake.speed;
      snowflake.windPhase += 0.01;
      snowflake.x += Math.sin(snowflake.windPhase) * snowflake.windOffset + this.wind.speed;

      if (snowflake.y > this.canvas.height) {
        snowflake.y = 0;
      }
      if (snowflake.x > this.canvas.width) {
        snowflake.x = 0;
      }
      if (snowflake.x < 0) {
        snowflake.x = this.canvas.width;
      }

      const gradient = this.ctx!.createRadialGradient(
        snowflake.x, snowflake.y, 0,
        snowflake.x, snowflake.y, snowflake.size
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${snowflake.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.ctx!.beginPath();
      this.ctx!.fillStyle = gradient;
      this.ctx!.arc(snowflake.x, snowflake.y, snowflake.size, 0, Math.PI * 2);
      this.ctx!.fill();
    });

    this.animationFrame = requestAnimationFrame(this.animate.bind(this));
  }

  override cleanup(): void {
    super.cleanup();
    if (this.windTimeout) {
      clearTimeout(this.windTimeout);
    }
  }
}