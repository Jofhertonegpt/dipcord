import { useMemo } from "react";

interface MediaEmbedProps {
  url: string;
}

export const MediaEmbed = ({ url }: MediaEmbedProps) => {
  const embedInfo = useMemo(() => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    
    // Medal.tv
    const medalRegex = /medal\.tv\/clips\/([a-zA-Z0-9]+)/;
    const medalMatch = url.match(medalRegex);

    if (youtubeMatch) {
      return {
        type: 'youtube',
        id: youtubeMatch[1],
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`
      };
    }

    if (medalMatch) {
      return {
        type: 'medal',
        id: medalMatch[1],
        embedUrl: `https://medal.tv/clip/${medalMatch[1]}/embed`
      };
    }

    return null;
  }, [url]);

  if (!embedInfo) return null;

  return (
    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden bg-black/5">
      <iframe
        src={embedInfo.embedUrl}
        className="absolute top-0 left-0 w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};