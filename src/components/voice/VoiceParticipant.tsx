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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isSpeakingState, setIsSpeakingState] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !stream) {
      console.log('No audio element or stream available for:', username);
      return;
    }

    const audio = audioRef.current;
    let mounted = true;

    const setupAudioAnalysis = () => {
      try {
        if (!audioContext.current) {
          audioContext.current = new AudioContext();
        }

        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 2048;
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          if (!analyser || !mounted) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          
          if (average > 30 && !isMuted) {
            console.log(`${username} is speaking - Audio level:`, average.toFixed(2));
            setIsSpeakingState(true);
          } else {
            setIsSpeakingState(false);
          }
          
          requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
        audioAnalyser.current = analyser;

      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    const setupAudioPlayback = async () => {
      try {
        console.log('Setting up audio playback for:', username);
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, state: t.readyState })));
        
        setAudioError(null);
        
        audio.muted = false;
        audio.volume = volume;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            console.log('Audio playing successfully for:', username);
            setIsPlaying(true);
            setupAudioAnalysis();
          }
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Audio playback failed for', username, ':', error);
          setAudioError(error.message);
          setIsPlaying(false);
          toast.error(`Audio playback error for ${username}: ${error.message}`);
          
          setTimeout(() => {
            if (mounted && audio) {
              console.log('Attempting audio recovery for:', username);
              setupAudioPlayback();
            }
          }, 1000);
        }
      }
    };

    // Set up event listeners
    audio.addEventListener('canplay', setupAudioPlayback);
    
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
      if (audioAnalyser.current) {
        audioAnalyser.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stream, username, volume, isMuted]);

  // Update deafened state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isDeafened || false;
      console.log('Updated deafened state for', username, ':', isDeafened);
    }
  }, [isDeafened, username]);

  return (
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
        {/* Speaking indicator ring */}
        {isSpeakingState && !audioError && isPlaying && (
          <span className="absolute inset-0 animate-pulse">
            <span className="absolute inset-0 rounded-full border-2 border-green-500"></span>
          </span>
        )}
        {/* Status indicators */}
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
  );
};