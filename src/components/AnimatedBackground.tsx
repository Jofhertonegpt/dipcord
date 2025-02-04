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

    // Pine tree properties
    const trees: {
      x: number;
      y: number;
      height: number;
      layers: number;
    }[] = [];
    
    // Initialize trees
    const numTrees = Math.floor(canvas.width / 100); // Adjust spacing based on screen width
    for (let i = 0; i < numTrees; i++) {
      trees.push({
        x: (i * canvas.width / numTrees) + (Math.random() * 50 - 25), // Add some randomness to x position
        y: canvas.height + 20, // Start below screen
        height: 150 + Math.random() * 100, // Random height
        layers: 5 + Math.floor(Math.random() * 3) // Random number of triangle layers
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

    // Draw a pine tree
    const drawTree = (x: number, y: number, height: number, layers: number) => {
      const baseWidth = height * 0.6;
      const layerHeight = height / layers;
      
      // Draw trunk
      ctx.fillStyle = '#3B2417';
      ctx.fillRect(x - 5, y - height * 0.2, 10, height * 0.2);
      
      // Draw tree layers (triangles)
      ctx.fillStyle = '#0B3B24';
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(x - currentWidth / 2 + 5, currentHeight - 2);
        ctx.lineTo(x + currentWidth / 2 - 5, currentHeight - 2);
        ctx.lineTo(x, currentHeight - layerHeight + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0B3B24';
      }
    };

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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