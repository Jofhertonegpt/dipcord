import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "star" | "triangle";
  opacity: number;
}

interface ButtonParticlesProps {
  x: number;
  y: number;
}

export const ButtonParticles = ({ x, y }: ButtonParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 5 + Math.random() * 10;
      const shape = Math.random() < 0.33 ? "circle" : Math.random() < 0.66 ? "star" : "triangle";
      
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Add upward boost
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape,
        opacity: 1
      });
    }

    const drawParticle = (particle: Particle) => {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();

      switch (particle.shape) {
        case "star":
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const x = Math.cos(angle) * particle.size;
            const y = Math.sin(angle) * particle.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          break;
        case "triangle":
          const size = particle.size * 1.5;
          ctx.moveTo(-size/2, size/2);
          ctx.lineTo(size/2, size/2);
          ctx.lineTo(0, -size/2);
          break;
        default:
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter(particle => particle.opacity > 0);

      particles.current.forEach(particle => {
        // Apply gravity
        particle.vy += 0.2;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Update rotation
        particle.rotation += particle.rotationSpeed;
        
        // Fade out
        particle.opacity -= 0.02;
        
        // Draw
        drawParticle(particle);
      });

      if (particles.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [x, y]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
};