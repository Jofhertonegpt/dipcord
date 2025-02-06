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
  const audioContext = useRef<AudioContext | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5); // Default to 50%
  const [isSpeakingState, setIsSpeakingState] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (gainNode.current) {
      gainNode.current.gain.value = newVolume;
    }
  };

  useEffect(() => {
    if (!audioRef.current || !stream) {
      console.log(`[${username}] No audio element or stream available`);
      return;
    }

    const audio = audioRef.current;
    let mounted = true;

    const setupAudioAnalysis = () => {
      try {
        if (!audioContext.current) {
          audioContext.current = new AudioContext();
          console.log(`[${username}] Created new AudioContext`);
        }

        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 2048;
        
        // Create and configure gain node
        gainNode.current = audioContext.current.createGain();
        gainNode.current.gain.value = volume;

        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(gainNode.current);
        gainNode.current.connect(analyser);
        console.log(`[${username}] Audio analysis setup complete`);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          if (!analyser || !mounted) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          
          if (average > 30 && !isMuted) {
            console.log(`[${username}] Speaking detected - Audio level: ${average.toFixed(2)}`);
            setIsSpeakingState(true);
          } else {
            setIsSpeakingState(false);
          }
          
          requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
        audioAnalyser.current = analyser;

      } catch (error) {
        console.error(`[${username}] Error setting up audio analysis:`, error);
      }
    };

    const setupAudioPlayback = async () => {
      try {
        console.log(`[${username}] Setting up audio playback`);
        console.log(`[${username}] Stream tracks:`, stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          state: t.readyState,
          muted: t.muted,
          id: t.id
        })));
        
        setAudioError(null);
        
        if (audioContext.current?.state === 'suspended') {
          console.log(`[${username}] Resuming suspended audio context`);
          await audioContext.current.resume();
        }
        
        audio.muted = false;
        audio.volume = volume;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            console.log(`[${username}] Audio playing successfully`);
            setIsPlaying(true);
            setupAudioAnalysis();
          }
        }
      } catch (error: any) {
        if (mounted) {
          console.error(`[${username}] Audio playback failed:`, error);
          setAudioError(error.message);
          setIsPlaying(false);
          toast.error(`Audio playback error for ${username}: ${error.message}`);
          
          setTimeout(() => {
            if (mounted && audio) {
              console.log(`[${username}] Attempting audio recovery`);
              setupAudioPlayback();
            }
          }, 1000);
        }
      }
    };

    audio.addEventListener('canplay', setupAudioPlayback);
    
    audio.addEventListener('error', (event: Event) => {
      if (mounted) {
        const error = event instanceof ErrorEvent ? event.message : 'Unknown audio error';
        console.error(`[${username}] Audio error:`, error);
        setAudioError(error);
        setIsPlaying(false);
        toast.error(`Audio error for ${username}: ${error}`);
      }
    });

    setupAudioPlayback();

    return () => {
      mounted = false;
      if (audio) {
        console.log(`[${username}] Cleaning up audio`);
        audio.removeEventListener('canplay', setupAudioPlayback);
        audio.pause();
        audio.srcObject = null;
      }
      if (audioAnalyser.current) {
        audioAnalyser.current.disconnect();
      }
      if (gainNode.current) {
        gainNode.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stream, username, volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isDeafened || false;
      console.log(`[${username}] Updated deafened state:`, isDeafened);
    }
  }, [isDeafened, username]);

  return (
    <UserContextMenu 
      userId={username} 
      username={username}
      isMuted={isMuted}
      isDeafened={isDeafened}
      onVolumeChange={handleVolumeChange}
      currentVolume={volume}
    >
      <div className={`flex items-center gap-3 p-2 rounded-lg ${
        isSpeakingState ? 'bg-green-500/10' : 'hover:bg-white/5'
      }`}>
        <div className="relative">
          <Avatar className="h-8 w-8 relative">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback>
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isSpeakingState && !audioError && isPlaying && (
            <span className="absolute inset-0 animate-pulse">
              <span className="absolute inset-0 rounded-full border-2 border-green-500"></span>
            </span>
          )}
          {isSpeakingState && !audioError && isPlaying && (
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
    </UserContextMenu>
  );
};