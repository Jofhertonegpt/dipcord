import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size and handle resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star properties
    const stars: {
      x: number;
      y: number;
      radius: number;
      color: string;
      twinkleSpeed: number;
      twinklePhase: number;
    }[] = [];
    const numStars = 150;
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
    
    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Snowflake properties
    const snowflakes: {
      x: number;
      y: number;
      size: number;
      speed: number;
      windOffset: number;
      windPhase: number;
    }[] = [];
    const numSnowflakes = 300;

    // Initialize snowflakes
    for (let i = 0; i < numSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: 1 + Math.random() * 2,
        windOffset: Math.random() * 2 - 1,
        windPhase: Math.random() * Math.PI * 2
      });
    }

    // Wind properties
    let windStrength = 0;
    let targetWindStrength = 0;
    const updateWind = () => {
      targetWindStrength = Math.random() * 4 - 2;
      setTimeout(updateWind, 5000 + Math.random() * 5000);
    };
    updateWind();

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smoothly adjust wind strength
      windStrength += (targetWindStrength - windStrength) * 0.002;

      // Draw and animate stars
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const glow = Math.abs(Math.sin(star.twinklePhase)) * 15;
        
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius + glow
        );
        gradient.addColorStop(0, star.color);
        gradient.addColorStop(0.5, `${star.color}40`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(star.x, star.y, star.radius + glow, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw and animate snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      snowflakes.forEach(flake => {
        flake.windPhase += 0.02;
        const windEffect = Math.sin(flake.windPhase) * 0.5;
        
        flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2);
        flake.y += flake.speed * (1 + Math.abs(windStrength) * 0.2);

        // Reset snowflake position when it goes off screen
        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) {
          flake.x = 0;
        }
        if (flake.x < 0) {
          flake.x = canvas.width;
        }

        // Draw snowflake with subtle gradient
        const gradient = ctx.createRadialGradient(
          flake.x, flake.y, 0,
          flake.x, flake.y, flake.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};

export default AnimatedBackground;