import { useState, useEffect } from "react";
import { VoiceParticipantList } from "./VoiceParticipantList";
import { VoiceControls } from "./VoiceControls";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/webrtc/useWebRTC";
import { Loader2 } from "lucide-react";

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel = ({ channelId }: VoiceChannelProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();

  const {
    isInitialized,
    error,
    initializeWebRTC,
    cleanup,
    localStream,
    createPeer
  } = useWebRTC({
    channelId,
    onTrack: (event, participantId) => {
      console.log(`Received track from ${participantId}:`, event.track.kind);
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play().catch(console.error);
    }
  });

  // Query existing participants
  const { data: participants } = useQuery({
    queryKey: ['voice-participants', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_channel_participants')
        .select('*, profiles(id, username, avatar_url)')
        .eq('channel_id', channelId)
        .eq('connection_state', 'connected');

      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Check if user is already in this specific channel
  const { data: existingParticipant } = useQuery({
    queryKey: ['voice-participant', channelId],
    queryFn: async () => {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from('voice_channel_participants')
        .select('*, profiles(username, avatar_url)')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing participant:', error);
        return null;
      }
      return data;
    },
    enabled: !!channelId,
  });

  const joinChannel = useMutation({
    mutationFn: async () => {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      if (!user) throw new Error("Not authenticated");

      // First try to update existing record
      const { data: existingData, error: existingError } = await supabase
        .from('voice_channel_participants')
        .update({
          connection_state: 'connected',
          last_heartbeat: new Date().toISOString()
        })
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (existingData) return existingData;

      // If no existing record, create new one
      const { data, error } = await supabase
        .from('voice_channel_participants')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          connection_state: 'connected',
          last_heartbeat: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      setIsConnected(true);
      toast.success("Joined voice channel");

      // Create peer connections with existing participants
      if (participants) {
        participants.forEach(async participant => {
          const userResponse = await supabase.auth.getUser();
          const user = userResponse.data.user;
          if (user && participant.user_id !== user.id) {
            createPeer(participant.user_id, true);
          }
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to join channel: ${error.message}`);
      setIsConnecting(false);
      cleanup();
    },
  });

  const leaveChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .update({ connection_state: 'disconnected' })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      setIsConnected(false);
      cleanup();
      toast.success("Left voice channel");
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave channel: ${error.message}`);
    },
  });

  const handleJoinChannel = async () => {
    setIsConnecting(true);
    try {
      await initializeWebRTC();
      await joinChannel.mutateAsync();
    } catch (error) {
      console.error('Failed to join voice channel:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveChannel.mutate();
      }
    };
  }, [isConnected]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <VoiceParticipantList channelId={channelId} />
      </div>
      {!isConnected ? (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleJoinChannel}
            disabled={isConnecting}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              "Join Voice"
            )}
          </button>
        </div>
      ) : (
        <>
          <VoiceControls
            channelId={channelId}
            onMuteChange={(isMuted) => {
              if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                  track.enabled = !isMuted;
                });
              }
            }}
            onDeafenChange={(isDeafened) => {
              // Handle deafen state
            }}
          />
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => leaveChannel.mutate()}
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