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
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !stream) return;

    const audio = audioRef.current;
    let mounted = true;

    const initializeAudioContext = async () => {
      try {
        // Create AudioContext only if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Resume AudioContext if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        return true;
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        return false;
      }
    };

    const setupAudioPlayback = async () => {
      try {
        // Check browser audio support
        if (!audio.canPlayType('audio/webm') && !audio.canPlayType('audio/ogg')) {
          throw new Error('Browser does not support required audio formats');
        }

        // Initialize AudioContext
        const contextInitialized = await initializeAudioContext();
        if (!contextInitialized) {
          throw new Error('Failed to initialize audio system');
        }

        // Connect stream to audio element
        audio.srcObject = stream;
        
        // Attempt playback
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            console.log('Audio playing successfully for:', username);
            setIsPlaying(true);
            setAudioError(null);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Audio setup failed:', error);
          setAudioError(error.message);
          setIsPlaying(false);
          toast.error(`Audio error for ${username}: ${error.message}`);
        }
      }
    };

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

    // Set up event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Initial setup
    setupAudioPlayback();

    // Cleanup function
    return () => {
      mounted = false;
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.srcObject = null;
      setIsPlaying(false);
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [stream, username]);

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
        muted={isDeafened}
      />
    </div>
  );
};