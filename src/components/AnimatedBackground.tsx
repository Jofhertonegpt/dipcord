import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createBackgroundImage } from './background/BackgroundImage';
import { drawSnowflake } from './background/Snowflake';
import { useSnowfall } from './background/useSnowfall';
import { useIsMobile } from '@/hooks/use-mobile';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const animationFrameRef = useRef<number>();
  
  const { 
    settings, 
    snowflakes, 
    windStrength, 
    targetWindStrength, 
    setWindStrength,
    initializeSnowflakes 
  } = useSnowfall();

  const { backgroundImage, drawBackground } = useMemo(() => 
    createBackgroundImage(isMobile), [isMobile]
  );

  const animate = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas);

    // Update wind
    setWindStrength(prev => prev + (targetWindStrength - prev) * 0.002);

    // Update and draw snowflakes
    snowflakes.forEach(flake => {
      flake.windPhase += 0.02 * settings.animationSpeed;
      const windEffect = Math.sin(flake.windPhase) * 0.5;
      
      flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2) * settings.animationSpeed;
      flake.y += flake.speed;

      if (flake.y > canvas.height) {
        flake.y = -5;
        flake.x = Math.random() * canvas.width;
      }
      if (flake.x > canvas.width) flake.x = 0;
      if (flake.x < 0) flake.x = canvas.width;

      drawSnowflake(ctx, flake, settings.color);
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [drawBackground, settings, snowflakes, targetWindStrength, windStrength, setWindStrength]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    initializeSnowflakes(canvas);

    // Start animation when image is loaded
    backgroundImage.onload = () => {
      animate();
    };

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, backgroundImage, initializeSnowflakes]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};

export default AnimatedBackground;