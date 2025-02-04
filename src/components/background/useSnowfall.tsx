import { useState, useEffect, useCallback } from 'react';
import { Snowflake, createSnowflake } from './Snowflake';

interface BackgroundSettings {
  color: string;
  animationSpeed: number;
  density: number;
}

export const useSnowfall = () => {
  const [settings] = useState<BackgroundSettings>({
    color: '#ffffff',
    animationSpeed: 0.5,
    density: 150,
  });

  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [windStrength, setWindStrength] = useState(0);
  const [targetWindStrength, setTargetWindStrength] = useState(0);

  useEffect(() => {
    const timeoutId = setInterval(() => {
      setTargetWindStrength(Math.random() * 4 - 2);
    }, 5000);
    
    return () => clearInterval(timeoutId);
  }, []);

  const initializeSnowflakes = useCallback((canvas: HTMLCanvasElement) => {
    const newSnowflakes = Array.from(
      { length: settings.density }, 
      () => createSnowflake(canvas, settings.animationSpeed)
    );
    setSnowflakes(newSnowflakes);
  }, [settings.density, settings.animationSpeed]);

  return { 
    settings, 
    snowflakes, 
    windStrength, 
    targetWindStrength, 
    setWindStrength,
    initializeSnowflakes 
  };
};