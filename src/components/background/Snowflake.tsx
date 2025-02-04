export interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  windOffset: number;
  windPhase: number;
  opacity: number;
}

export const createSnowflake = (canvas: HTMLCanvasElement, animationSpeed: number): Snowflake => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 3 + 1,
  speed: (1 + Math.random() * 2) * animationSpeed,
  windOffset: Math.random() * 2 - 1,
  windPhase: Math.random() * Math.PI * 2,
  opacity: 0.4 + Math.random() * 0.6
});

export const drawSnowflake = (
  ctx: CanvasRenderingContext2D,
  flake: Snowflake,
  color: string
) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const gradient = ctx.createRadialGradient(
    flake.x, flake.y, 0,
    flake.x, flake.y, flake.size
  );
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flake.opacity})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
  ctx.fill();
};