export abstract class BaseAnimation {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D | null;
  protected animationFrame: number | undefined;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  protected resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  abstract animate(): void;

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  cleanup(): void {
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
    this.stop();
  }
}