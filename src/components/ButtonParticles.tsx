import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  velocity: { x: number; y: number };
  opacity: number;
  rotation: number;
  shape: "circle" | "star" | "triangle";
}

export const ButtonParticles = ({ x, y }: { x: number; y: number }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const christmasColors = [
    "#ea384c", // Red
    "#34a853", // Green
    "#fbbc05", // Gold
    "#ffffff", // White
  ];

  const createShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: "circle" | "star" | "triangle", rotation: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (shape === "star") {
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size / 2;

      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * i) / spikes;
        const pointX = Math.cos(angle) * radius;
        const pointY = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(pointX, pointY);
        else ctx.lineTo(pointX, pointY);
      }
      ctx.closePath();
    } else if (shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(-size / 2, size / 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.lineTo(0, -size / 2);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particleCount = 24;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 8 + Math.random() * 8;
      const shape = Math.random() < 0.33 ? "star" : Math.random() < 0.66 ? "triangle" : "circle";
      
      newParticles.push({
        id: i,
        x,
        y,
        size: Math.random() * 8 + 4,
        color: christmasColors[Math.floor(Math.random() * christmasColors.length)],
        velocity: {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity,
        },
        opacity: 1,
        rotation: Math.random() * Math.PI * 2,
        shape,
      });
    }

    setParticles(newParticles);

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setParticles(prevParticles => 
        prevParticles
          .map(particle => {
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.velocity.y += 0.2; // gravity
            particle.opacity *= 0.96;
            particle.rotation += 0.1;
            particle.size *= 0.96;

            ctx.save();
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.opacity;
            
            createShape(ctx, particle.x, particle.y, particle.size, particle.shape, particle.rotation);
            ctx.fill();
            ctx.restore();

            return particle;
          })
          .filter(particle => particle.opacity > 0.1)
      );

      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [x, y]);

  return null;
};