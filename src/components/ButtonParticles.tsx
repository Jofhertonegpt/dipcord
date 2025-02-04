import { useEffect, useRef } from "react";
import { ButtonParticleAnimation } from "./animations/ButtonParticleAnimation";

interface ButtonParticlesProps {
  x: number;
  y: number;
}

export const ButtonParticles = ({ x, y }: ButtonParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<ButtonParticleAnimation>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    animationRef.current = new ButtonParticleAnimation(canvas, x, y);
    animationRef.current.start();

    return () => {
      animationRef.current?.cleanup();
    };
  }, [x, y]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
};