import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  velocity: { x: number; y: number };
}

export const ButtonParticles = ({ x, y }: { x: number; y: number }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const christmasColors = [
    "#ea384c", // Red
    "#34a853", // Green
    "#fbbc05", // Gold
    "#ffffff", // White
  ];

  useEffect(() => {
    const particleCount = 12;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 5;
      
      newParticles.push({
        id: i,
        x,
        y,
        size: Math.random() * 4 + 2,
        color: christmasColors[Math.floor(Math.random() * christmasColors.length)],
        velocity: {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity,
        },
      });
    }

    setParticles(newParticles);

    const animationFrame = requestAnimationFrame(function animate() {
      setParticles((prevParticles) =>
        prevParticles
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.velocity.x,
            y: particle.y + particle.velocity.y,
            size: particle.size * 0.9,
          }))
          .filter((particle) => particle.size > 0.1)
      );

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [x, y]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};