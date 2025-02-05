import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { UserContextMenu } from "./UserContextMenu";

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

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isSpeaking ? 'bg-green-500/10' : 'hover:bg-white/5'
    }`}>
      <Avatar className="h-8 w-8 relative">
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback>
          {username.substring(0, 2).toUpperCase()}
        </AvatarFallback>
        {isSpeaking && (
          <span className="absolute -right-1 -bottom-1">
            <Volume2 className="h-4 w-4 text-green-500" />
          </span>
        )}
      </Avatar>
      
      <span className="flex-1 text-sm font-medium">
        {username}
      </span>
      
      <div className="flex items-center gap-2">
        {isMuted && <MicOff className="h-4 w-4 text-muted-foreground" />}
        {!isMuted && <Mic className="h-4 w-4 text-green-500" />}
      </div>

      {stream && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={isDeafened}
        />
      )}
    </div>
  );
};