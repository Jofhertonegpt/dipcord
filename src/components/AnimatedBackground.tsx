import { useEffect, useRef, useState } from "react";
import { useSnowfall } from "./background/useSnowfall";
import { BackgroundImage } from "./background/BackgroundImage";

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const { initSnowfall, cleanup } = useSnowfall();

  useEffect(() => {
    if (!canvasRef.current || !isCanvasReady) return;
    
    const cleanup = initSnowfall(canvasRef.current);
    
    return () => {
      cleanup();
    };
  }, [isCanvasReady, initSnowfall]);

  useEffect(() => {
    if (canvasRef.current) {
      setIsCanvasReady(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <BackgroundImage />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default AnimatedBackground;