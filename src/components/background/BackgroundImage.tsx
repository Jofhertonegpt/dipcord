export const createBackgroundImage = (isMobile: boolean) => {
  const backgroundImage = new Image();
  backgroundImage.src = isMobile 
    ? '/lovable-uploads/1da6a61e-48ab-4e29-8985-25a73d9cf296.png'
    : '/lovable-uploads/a51ed3d1-cea0-4481-bd89-2dc96f2557c3.png';

  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const scale = Math.max(
      canvas.width / backgroundImage.width,
      canvas.height / backgroundImage.height
    );
    const scaledWidth = backgroundImage.width * scale;
    const scaledHeight = backgroundImage.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    
    ctx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
  };

  return { backgroundImage, drawBackground };
};