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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioRef.current || !stream) return;

    const audio = audioRef.current;
    let mounted = true;

    const setupAudioPlayback = async () => {
      try {
        // Reset error state
        setAudioError(null);

        // Ensure audio is unmuted and volume is set
        audio.muted = false;
        audio.volume = 1.0;

        // Connect stream
        audio.srcObject = stream;

        // Play audio
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            console.log('Audio playing successfully for:', username);
            setIsPlaying(true);
          }
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Audio playback failed:', error);
          setAudioError(error.message);
          setIsPlaying(false);
          
          // Show error toast
          toast.error(`Audio playback error for ${username}: ${error.message}`);
          
          // Attempt recovery
          setTimeout(() => {
            if (mounted && audio) {
              console.log('Attempting audio recovery for:', username);
              setupAudioPlayback();
            }
          }, 2000);
        }
      }
    };

    // Set up event listeners
    const handleCanPlay = () => {
      console.log('Audio can play for:', username);
      setupAudioPlayback();
    };

    const handleError = (event: Event) => {
      if (mounted) {
        const error = event instanceof ErrorEvent ? event.message : 'Unknown audio error';
        console.error('Audio error:', error);
        setAudioError(error);
        setIsPlaying(false);
        toast.error(`Audio error for ${username}: ${error}`);
      }
    };

    // Add event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Initial setup
    setupAudioPlayback();

    // Cleanup
    return () => {
      mounted = false;
      if (audio) {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.srcObject = null;
      }
      setIsPlaying(false);
    };
  }, [stream, username]);

  // Update deafened state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isDeafened || false;
    }
  }, [isDeafened]);

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isSpeaking && !audioError && isPlaying ? 'bg-green-500/10' : 'hover:bg-white/5'
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
      />
    </div>
  );
};