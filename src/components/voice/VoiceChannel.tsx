import { useEffect, useRef, useState } from "react";
import { VoiceParticipantList } from "./VoiceParticipantList";
import { VoiceControls } from "./VoiceControls";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel = ({ channelId }: VoiceChannelProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const queryClient = useQueryClient();

  const joinChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .insert([
          {
            channel_id: channelId,
            user_id: user.id,
            is_muted: false,
            is_deafened: false,
          },
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      toast.success("Joined voice channel");
    },
    onError: (error: Error) => {
      toast.error(`Failed to join channel: ${error.message}`);
    },
  });

  const leaveChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      toast.success("Left voice channel");
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave channel: ${error.message}`);
    },
  });

  const initializeVoiceChat = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      localStream.current.getTracks().forEach((track) => {
        if (peerConnection.current && localStream.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      await joinChannel.mutateAsync();
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to initialize voice chat:", error);
      toast.error("Failed to initialize voice chat. Please check your microphone permissions.");
    }
  };

  const handleMuteChange = (isMuted: boolean) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  };

  const handleDeafenChange = (isDeafened: boolean) => {
    // Handle deafening logic here when we implement incoming audio
  };

  const cleanup = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (isConnected) {
      await leaveChannel.mutateAsync();
    }
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <VoiceParticipantList channelId={channelId} />
      </div>
      {!isConnected ? (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={initializeVoiceChat}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Join Voice
          </button>
        </div>
      ) : (
        <>
          <VoiceControls
            channelId={channelId}
            onMuteChange={handleMuteChange}
            onDeafenChange={handleDeafenChange}
          />
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => cleanup()}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
};