import { useEffect, useRef, useState } from "react";
import { SnowfallAnimation } from "./animations/SnowfallAnimation";

const BackgroundImage = () => (
  <div className="absolute inset-0 -z-10">
    <picture>
      <source
        media="(max-width: 768px)"
        srcSet="/lovable-uploads/1da6a61e-48ab-4e29-8985-25a73d9cf296.png"
      />
      <img
        src="/lovable-uploads/a51ed3d1-cea0-4481-bd89-2dc96f2557c3.png"
        alt="Background"
        className="object-cover w-full h-full"
      />
    </picture>
  </div>
);

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<SnowfallAnimation>();

  useEffect(() => {
    if (!canvasRef.current) return;
    
    animationRef.current = new SnowfallAnimation(canvasRef.current);
    animationRef.current.start();
    
    return () => {
      animationRef.current?.cleanup();
    };
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