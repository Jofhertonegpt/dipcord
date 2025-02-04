import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(pixelRatio, pixelRatio);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const backgroundImage = new Image();
    backgroundImage.src = '/lovable-uploads/1507ee57-1fc6-42bd-85b8-056eee1a9857.png';
    
    // Star properties with enhanced twinkling
    const stars: {
      x: number;
      y: number;
      size: number;
      brightness: number;
      twinkleSpeed: number;
      twinklePhase: number;
    }[] = [];

    // Initialize more stars for a denser night sky
    const numStars = 300;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * (window.innerHeight * 0.4),
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Enhanced snowflake properties
    const snowflakes: {
      x: number;
      y: number;
      size: number;
      speed: number;
      windOffset: number;
      windPhase: number;
      opacity: number;
    }[] = [];
    
    // Initialize more detailed snowflakes
    const numSnowflakes = 250;
    for (let i = 0; i < numSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1,
        speed: 1 + Math.random() * 2,
        windOffset: Math.random() * 2 - 1,
        windPhase: Math.random() * Math.PI * 2,
        opacity: 0.4 + Math.random() * 0.6
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

    const animate = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Draw background image with true cover behavior
      if (backgroundImage.complete) {
        const canvasAspect = window.innerWidth / window.innerHeight;
        const imageAspect = backgroundImage.width / backgroundImage.height;
        
        let drawWidth = window.innerWidth;
        let drawHeight = window.innerHeight;
        
        if (canvasAspect < imageAspect) {
          // Canvas is taller than image aspect ratio
          drawHeight = window.innerWidth / imageAspect;
          const scale = window.innerHeight / drawHeight;
          drawWidth *= scale;
          drawHeight *= scale;
        } else {
          // Canvas is wider than image aspect ratio
          drawWidth = window.innerHeight * imageAspect;
          const scale = window.innerWidth / drawWidth;
          drawWidth *= scale;
          drawHeight *= scale;
        }
        
        const x = (window.innerWidth - drawWidth) / 2;
        const y = (window.innerHeight - drawHeight) / 2;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(backgroundImage, x, y, drawWidth, drawHeight);
      }

      // Draw enhanced twinkling stars
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5;
        const alpha = 0.3 + (star.brightness * twinkle * 0.7);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update wind
      windStrength += (targetWindStrength - windStrength) * 0.002;

      // Draw enhanced snowflakes
      snowflakes.forEach(flake => {
        flake.windPhase += 0.02;
        const windEffect = Math.sin(flake.windPhase) * 0.5;
        
        flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2);
        flake.y += flake.speed;

        if (flake.y > window.innerHeight) {
          flake.y = -5;
          flake.x = Math.random() * window.innerWidth;
        }
        if (flake.x > window.innerWidth) flake.x = 0;
        if (flake.x < 0) flake.x = window.innerWidth;

        const gradient = ctx.createRadialGradient(
          flake.x, flake.y, 0,
          flake.x, flake.y, flake.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};

export default AnimatedBackground;
