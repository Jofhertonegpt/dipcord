import { useCallback, useRef } from "react";
import { Snowflake, SnowflakeImpl } from "./Snowflake";

export const useSnowfall = () => {
  const snowflakes = useRef<Snowflake[]>([]);
  const animationFrame = useRef<number>();
  const windTimeout = useRef<NodeJS.Timeout>();
  const wind = useRef({ speed: 0, target: 0 });

  const cleanup = useCallback(() => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    if (windTimeout.current) {
      clearTimeout(windTimeout.current);
    }
    snowflakes.current = [];
  }, []);

  const updateWind = useCallback(() => {
    const updateWindSpeed = () => {
      wind.current.target = (Math.random() - 0.5) * 2;
      wind.current.speed += (wind.current.target - wind.current.speed) * 0.01;
      
      windTimeout.current = setTimeout(updateWindSpeed, 2000);
    };
    
    updateWindSpeed();
  }, []);

  const initSnowfall = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return cleanup;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize snowflakes
    const snowflakeCount = Math.floor((window.innerWidth * window.innerHeight) / 15000);
    for (let i = 0; i < snowflakeCount; i++) {
      snowflakes.current.push(new SnowflakeImpl(canvas.width, canvas.height));
    }

    // Start wind simulation
    updateWind();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakes.current.forEach(snowflake => {
        snowflake.update(wind.current.speed);
        snowflake.draw(ctx);
      });

      animationFrame.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cleanup();
    };
  }, [cleanup, updateWind]);

  return { initSnowfall, cleanup };
};