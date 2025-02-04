import { useState, useEffect } from 'react';
import { Snowflake, createSnowflake } from './Snowflake';

interface BackgroundSettings {
  color: string;
  animationSpeed: number;
  density: number;
}

export const useSnowfall = (canvas: HTMLCanvasElement | null) => {
  const [settings, setSettings] = useState<BackgroundSettings>({
    color: '#ea384c',
    animationSpeed: 1,
    density: 250,
  });

  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [windStrength, setWindStrength] = useState(0);
  const [targetWindStrength, setTargetWindStrength] = useState(0);

  useEffect(() => {
    const handleBackgroundUpdate = (event: CustomEvent<BackgroundSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener('updateBackground', handleBackgroundUpdate as EventListener);
    return () => {
      window.removeEventListener('updateBackground', handleBackgroundUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!canvas) return;
    
    const initializeSnowflakes = () => {
      const newSnowflakes = Array.from(
        { length: settings.density }, 
        () => createSnowflake(canvas, settings.animationSpeed)
      );
      setSnowflakes(newSnowflakes);
    };

    initializeSnowflakes();
  }, [canvas, settings.density, settings.animationSpeed]);

  useEffect(() => {
    const updateWind = () => {
      setTargetWindStrength(Math.random() * 4 - 2);
      setTimeout(updateWind, 5000 + Math.random() * 5000);
    };
    updateWind();
  }, []);

  return { settings, snowflakes, windStrength, targetWindStrength, setWindStrength };
};