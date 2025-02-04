export interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  windOffset: number;
  windPhase: number;
  opacity: number;
  update: (windSpeed: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export class SnowflakeImpl implements Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  windOffset: number;
  windPhase: number;
  opacity: number;
  private canvas: HTMLCanvasElement;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 3 + 1;
    this.speed = 1 + Math.random() * 2;
    this.windOffset = Math.random() * 2 - 1;
    this.windPhase = Math.random() * Math.PI * 2;
    this.opacity = 0.4 + Math.random() * 0.6;
    this.canvas = document.createElement('canvas');
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
  }

  update(windSpeed: number) {
    this.y += this.speed;
    this.windPhase += 0.01;
    this.x += Math.sin(this.windPhase) * this.windOffset + windSpeed;

    if (this.y > this.canvas.height) {
      this.y = 0;
    }
    if (this.x > this.canvas.width) {
      this.x = 0;
    }
    if (this.x < 0) {
      this.x = this.canvas.width;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}