import { useState, useEffect, useCallback } from 'react';
import { Snowflake, createSnowflake } from './Snowflake';

interface BackgroundSettings {
  color: string;
  animationSpeed: number;
  density: number;
}

export const useSnowfall = () => {
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
    let timeoutId: NodeJS.Timeout;
    const updateWind = () => {
      setTargetWindStrength(Math.random() * 4 - 2);
      timeoutId = setTimeout(updateWind, 5000 + Math.random() * 5000);
    };
    updateWind();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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