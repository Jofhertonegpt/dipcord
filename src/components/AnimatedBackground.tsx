import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pine tree properties with more realistic proportions
    const trees: {
      x: number;
      y: number;
      height: number;
      layers: number;
      variation: number;
    }[] = [];
    
    // Initialize trees with varied heights and positions
    const numTrees = Math.floor(canvas.width / 100);
    for (let i = 0; i < numTrees; i++) {
      trees.push({
        x: (i * canvas.width / numTrees) + (Math.random() * 80 - 40),
        y: canvas.height + 20,
        height: 200 + Math.random() * 150,
        layers: 7 + Math.floor(Math.random() * 4),
        variation: Math.random()
      });
    }

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
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.8),
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
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
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

    // Draw a more realistic pine tree
    const drawTree = (x: number, y: number, height: number, layers: number, variation: number) => {
      const baseWidth = height * 0.4;
      const layerHeight = height / layers;
      
      // Draw trunk with more natural color
      ctx.fillStyle = '#2A1B0A';
      const trunkWidth = height * 0.05;
      ctx.fillRect(x - trunkWidth/2, y - height * 0.2, trunkWidth, height * 0.2);
      
      // Draw tree layers with more natural variation
      for (let i = 0; i < layers; i++) {
        const currentHeight = y - (i * layerHeight);
        const layerWidth = (baseWidth * (layers - i)) / layers;
        const offsetX = Math.sin(i + variation) * (layerWidth * 0.1);
        
        // Draw main foliage with darker base
        ctx.fillStyle = '#0A2F1F';
        ctx.beginPath();
        ctx.moveTo(x - layerWidth/2 + offsetX, currentHeight);
        ctx.lineTo(x + layerWidth/2 + offsetX, currentHeight);
        ctx.lineTo(x + offsetX, currentHeight - layerHeight * 1.2);
        ctx.closePath();
        ctx.fill();
        
        // Add snow with subtle shadows
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(x - layerWidth/2 + offsetX + 5, currentHeight - 2);
        ctx.lineTo(x + layerWidth/2 + offsetX - 5, currentHeight - 2);
        ctx.lineTo(x + offsetX, currentHeight - layerHeight * 1.1);
        ctx.closePath();
        ctx.fill();
        
        // Add highlights for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x + offsetX, currentHeight - layerHeight * 1.1);
        ctx.lineTo(x + layerWidth/4 + offsetX, currentHeight - layerHeight * 0.5);
        ctx.lineTo(x + offsetX, currentHeight - layerHeight * 0.8);
        ctx.closePath();
        ctx.fill();
      }
    };

    // Animation loop
    const animate = () => {
      // Draw deep night sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A0A2F');
      gradient.addColorStop(0.5, '#1A1A4F');
      gradient.addColorStop(1, '#2A2A6F');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      // Draw refined trees
      trees.forEach(tree => {
        drawTree(tree.x, tree.y, tree.height, tree.layers, tree.variation);
      });

      // Draw enhanced snowflakes
      snowflakes.forEach(flake => {
        flake.windPhase += 0.02;
        const windEffect = Math.sin(flake.windPhase) * 0.5;
        
        flake.x += (windStrength + windEffect + flake.windOffset) * (flake.size / 2);
        flake.y += flake.speed;

        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;

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