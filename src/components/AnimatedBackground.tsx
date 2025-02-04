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

    // Pine tree properties with taller, more realistic proportions
    const trees: {
      x: number;
      y: number;
      height: number;
      layers: number;
    }[] = [];
    
    // Initialize trees with more varied heights and positions
    const numTrees = Math.floor(canvas.width / 80); // Slightly more dense forest
    for (let i = 0; i < numTrees; i++) {
      trees.push({
        x: (i * canvas.width / numTrees) + (Math.random() * 60 - 30), // More random positioning
        y: canvas.height + 20,
        height: 180 + Math.random() * 120, // Taller trees with more height variation
        layers: 6 + Math.floor(Math.random() * 4) // More layers for fuller trees
      });
    }

    // Star properties
    const stars: {
      x: number;
      y: number;
      size: number;
      brightness: number;
      twinkleSpeed: number;
      twinklePhase: number;
    }[] = [];

    // Initialize stars
    const numStars = 200;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.7), // Stars only in upper portion
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
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
    const numSnowflakes = 200;

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

    // Draw a pine tree
    const drawTree = (x: number, y: number, height: number, layers: number) => {
      const baseWidth = height * 0.5; // Slimmer trees
      const layerHeight = height / layers;
      
      // Draw trunk
      ctx.fillStyle = '#2A1B0A';
      ctx.fillRect(x - 6, y - height * 0.2, 12, height * 0.2);
      
      // Draw tree layers (triangles)
      ctx.fillStyle = '#0A2F1F';
      for (let i = 0; i < layers; i++) {
        const currentHeight = y - (i * layerHeight);
        const currentWidth = (baseWidth * (layers - i)) / layers;
        
        ctx.beginPath();
        ctx.moveTo(x - currentWidth / 2, currentHeight);
        ctx.lineTo(x + currentWidth / 2, currentHeight);
        ctx.lineTo(x, currentHeight - layerHeight);
        ctx.closePath();
        ctx.fill();
        
        // Add snow on branches
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(x - currentWidth / 2 + 5, currentHeight - 2);
        ctx.lineTo(x + currentWidth / 2 - 5, currentHeight - 2);
        ctx.lineTo(x, currentHeight - layerHeight + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0A2F1F';
      }
    };

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      // Draw night sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A0A2F'); // Deep blue at top
      gradient.addColorStop(0.5, '#1A1A4F'); // Lighter blue in middle
      gradient.addColorStop(1, '#2A2A6F'); // Even lighter at bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars with twinkling effect
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5;
        const alpha = 0.3 + (star.brightness * twinkle * 0.7);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Smoothly adjust wind strength
      windStrength += (targetWindStrength - windStrength) * 0.002;

      // Draw trees
      trees.forEach(tree => {
        drawTree(tree.x, tree.y, tree.height, tree.layers);
      });

      // Draw and animate snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      snowflakes.forEach(flake => {
        flake.windPhase += 0.02;
        const windEffect = Math.sin(flake.windPhase) * 0.5;
        
        flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2);
        flake.y += flake.speed;

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