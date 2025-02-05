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
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!audioRef.current || !stream) {
      console.log('No audio element or stream available for:', username);
      return;
    }

    const audio = audioRef.current;
    let mounted = true;

    const setupAudioPlayback = async () => {
      try {
        console.log('Setting up audio playback for:', username);
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, state: t.readyState })));
        
        setAudioError(null);
        
        // Configure audio element
        audio.muted = false;
        audio.volume = volume;
        audio.srcObject = stream;
        
        // Enable automatic playing
        audio.autoplay = true;
        // Use the correct attribute name with setAttribute
        audio.setAttribute('playsinline', 'true');
        
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
          console.error('Audio playback failed for', username, ':', error);
          console.error('Audio element state:', {
            muted: audio.muted,
            volume: audio.volume,
            readyState: audio.readyState,
            paused: audio.paused,
            currentTime: audio.currentTime,
            error: audio.error
          });
          setAudioError(error.message);
          setIsPlaying(false);
          toast.error(`Audio playback error for ${username}: ${error.message}`);
          
          // Attempt recovery after a short delay
          setTimeout(() => {
            if (mounted && audio) {
              console.log('Attempting audio recovery for:', username);
              setupAudioPlayback();
            }
          }, 1000);
        }
      }
    };

    // Set up audio context for volume analysis
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    
    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(audioContext.destination);
    
    processor.onaudioprocess = () => {
      const array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      const arraySum = array.reduce((a, value) => a + value, 0);
      const average = arraySum / array.length;
      
      // Consider the participant speaking if the average volume is above a threshold
      if (average > 30 && !isMuted) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    };

    // Set up event listeners
    audio.addEventListener('canplay', () => {
      console.log('Audio can play for:', username);
      setupAudioPlayback();
    });
    
    audio.addEventListener('error', (event: Event) => {
      if (mounted) {
        const error = event instanceof ErrorEvent ? event.message : 'Unknown audio error';
        console.error('Audio error for', username, ':', error);
        setAudioError(error);
        setIsPlaying(false);
        toast.error(`Audio error for ${username}: ${error}`);
      }
    });

    // Initial setup
    setupAudioPlayback();

    // Cleanup
    return () => {
      mounted = false;
      if (audio) {
        console.log('Cleaning up audio for:', username);
        audio.removeEventListener('canplay', setupAudioPlayback);
        audio.pause();
        audio.srcObject = null;
      }
      processor.disconnect();
      analyser.disconnect();
      source.disconnect();
      audioContext.close();
      setIsPlaying(false);
    };
  }, [stream, username, volume]);

  // Update deafened state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isDeafened || false;
      console.log('Updated deafened state for', username, ':', isDeafened);
    }
  }, [isDeafened, username]);

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isSpeaking && !audioError && isPlaying ? 'bg-green-500/10' : 'hover:bg-white/5'
    }`}>
      <div className="relative">
        <Avatar className="h-8 w-8 relative">
          <AvatarImage src={avatarUrl || ''} />
          <AvatarFallback>
            {username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Speaking indicator ring */}
        {isSpeaking && !audioError && isPlaying && (
          <span className="absolute inset-0 animate-pulse">
            <span className="absolute inset-0 rounded-full border-2 border-green-500"></span>
          </span>
        )}
        {/* Status indicators */}
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
      </div>
      
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