import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { UserContextMenu } from "./UserContextMenu";
import { toast } from "sonner";

interface VoiceParticipantProps {
  username: string;
  avatarUrl?: string | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream;
}

export const VoiceParticipant = ({
  username,
  avatarUrl,
  isMuted,
  isDeafened,
  isSpeaking,
  stream
}: VoiceParticipantProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !stream) return;

    const audio = audioRef.current;

    const handleCanPlay = () => {
      console.log('Audio can play for:', username);
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playing successfully for:', username);
            setIsPlaying(true);
            setAudioError(null);
          })
          .catch(error => {
            console.error('Audio playback failed:', error);
            setAudioError('Failed to play audio');
            setIsPlaying(false);
            toast.error(`Failed to play audio for ${username}`);
          });
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Audio error:', event);
      setAudioError(event.message);
      setIsPlaying(false);
      toast.error(`Audio error for ${username}: ${event.message}`);
    };

    // Check if the browser supports audio playback
    if (!audio.canPlayType('audio/webm') && !audio.canPlayType('audio/ogg')) {
      const error = 'Browser does not support required audio formats';
      console.error(error);
      setAudioError(error);
      toast.error(error);
      return;
    }

    audio.srcObject = stream;
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError as EventListener);

    // Attempt to resume AudioContext if it's suspended
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(console.error);
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError as EventListener);
      audio.srcObject = null;
      setIsPlaying(false);
      audioContext.close().catch(console.error);
    };
  }, [stream, username]);

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isSpeaking ? 'bg-green-500/10' : 'hover:bg-white/5'
    }`}>
      <Avatar className="h-8 w-8 relative">
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback>
          {username.substring(0, 2).toUpperCase()}
        </AvatarFallback>
        {isSpeaking && !audioError && isPlaying && (
          <span className="absolute -right-1 -bottom-1">
            <Volume2 className="h-4 w-4 text-green-500" />
          </span>
        )}
        {audioError && (
          <span className="absolute -right-1 -bottom-1">
            <VolumeX className="h-4 w-4 text-red-500" />
          </span>
        )}
      </Avatar>
      
      <span className="flex-1 text-sm font-medium">
        {username}
        {audioError && (
          <span className="text-xs text-red-400 ml-2">
            Audio error
          </span>
        )}
      </span>
      
      <div className="flex items-center gap-2">
        {isMuted && <MicOff className="h-4 w-4 text-muted-foreground" />}
        {!isMuted && <Mic className="h-4 w-4 text-green-500" />}
      </div>

      <audio
        ref={audioRef}
        autoPlay
        playsInline
        muted={isDeafened}
      />
    </div>
  );
};