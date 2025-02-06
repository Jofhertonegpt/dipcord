import { useEffect, useState, useRef } from "react";
import { VoiceParticipantList } from "./VoiceParticipantList";
import { VoiceControls } from "./VoiceControls";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VoiceParticipant } from "./VoiceParticipant";
import { Loader2 } from "lucide-react";

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel = ({ channelId }: VoiceChannelProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const joinSoundRef = useRef<HTMLAudioElement>();
  const leaveSoundRef = useRef<HTMLAudioElement>();
  const queryClient = useQueryClient();

  const { isInitialized, error, connectionState, initializeWebRTC, cleanup, localStream } = useWebRTC({
    channelId,
    onTrack: (event, participantId) => {
      const [stream] = event.streams;
      if (!stream) return;
      
      setParticipants(prev => new Map(prev).set(participantId, {
        stream,
        isSpeaking: false
      }));
    }
  });

  // Check if user is already in any voice channel
  const { data: activeVoiceParticipation } = useQuery({
    queryKey: ['voice-participant-active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('voice_channel_participants')
        .select('channel_id, connection_state')
        .eq('user_id', user.id)
        .neq('connection_state', 'disconnected')
        .maybeSingle();

      if (error) {
        console.error('Error checking active voice participation:', error);
        return null;
      }
      return data;
    },
  });

  // Check if user is already in this specific channel
  const { data: existingParticipant } = useQuery({
    queryKey: ['voice-participant', channelId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  // Handle page unload
  useEffect(() => {
    const handleUnload = async () => {
      if (isConnected) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await supabase
            .from('voice_channel_participants')
            .update({
              connection_state: 'disconnected',
              is_muted: false,
              is_deafened: false
            })
            .eq('channel_id', channelId)
            .eq('user_id', data.user.id);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      // Cleanup when component unmounts
      if (isConnected) {
        leaveChannel.mutate();
      }
    };
  }, [isConnected, channelId]);

  useEffect(() => {
    // Initialize sounds
    joinSoundRef.current = new Audio("/sounds/join.mp3");
    joinSoundRef.current.volume = 0.5;
    
    leaveSoundRef.current = new Audio("/sounds/leave.mp3");
    leaveSoundRef.current.volume = 0.5;

    return () => {
      joinSoundRef.current = undefined;
      leaveSoundRef.current = undefined;
    };
  }, []);

  const joinChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (activeVoiceParticipation && activeVoiceParticipation.channel_id !== channelId) {
        throw new Error("You are already in another voice channel");
      }

      // First check if user is already in this channel
      const { data: existingParticipant, error: checkError } = await supabase
        .from('voice_channel_participants')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      // If participant exists and is not disconnected, return it
      if (existingParticipant && existingParticipant.connection_state !== 'disconnected') {
        return existingParticipant;
      }

      // If participant exists but is disconnected, update it
      if (existingParticipant) {
        const { data, error } = await supabase
          .from('voice_channel_participants')
          .update({
            connection_state: 'connecting',
            is_muted: false,
            is_deafened: false,
            last_heartbeat: new Date().toISOString()
          })
          .eq('id', existingParticipant.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // If no participant exists, create a new one
      const { data, error } = await supabase
        .from('voice_channel_participants')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          is_muted: false,
          is_deafened: false,
          connection_state: 'connecting',
          last_heartbeat: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      queryClient.invalidateQueries({ queryKey: ['voice-participant', channelId] });
      setIsConnected(true);
      toast.success("Joined voice channel");
      if (joinSoundRef.current) {
        joinSoundRef.current.play().catch(console.error);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to join channel: ${error.message}`);
      setIsConnecting(false);
    },
  });

  const leaveChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .update({
          connection_state: 'disconnected',
          is_muted: false,
          is_deafened: false
        })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      queryClient.invalidateQueries({ queryKey: ['voice-participant', channelId] });
      setIsConnected(false);
      cleanup();
      toast.success("Left voice channel");
      if (leaveSoundRef.current) {
        leaveSoundRef.current.play().catch(console.error);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave channel: ${error.message}`);
    },
  });

  const handleMuteChange = (isMuted: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  };

  const handleDeafenChange = (isDeafened: boolean) => {
    participants.forEach(({ stream }) => {
      if (stream) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = !isDeafened;
        });
      }
    });
  };

  useEffect(() => {
    if (!isConnected) return;

    const channel = supabase
      .channel(`voice-${channelId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('Voice presence synced');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('New participant joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Participant left:', leftPresences);
        leftPresences.forEach((presence: any) => {
          setParticipants(prev => {
            const next = new Map(prev);
            next.delete(presence.user_id);
            return next;
          });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, isConnected]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={() => leaveChannel.mutate()}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Leave Channel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <VoiceParticipantList channelId={channelId} />
        {Array.from(participants.entries()).map(([participantId, { stream }]) => (
          <VoiceParticipant
            key={participantId}
            username="Remote User"
            stream={stream}
          />
        ))}
      </div>
      {!isConnected ? (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={async () => {
              if (activeVoiceParticipation && activeVoiceParticipation.channel_id !== channelId) {
                toast.error("You are already in another voice channel");
                return;
              }
              setIsConnecting(true);
              try {
                await initializeWebRTC();
                await joinChannel.mutateAsync();
              } catch (error) {
                console.error('Failed to join voice channel:', error);
              } finally {
                setIsConnecting(false);
              }
            }}
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
            onMuteChange={handleMuteChange}
            onDeafenChange={handleDeafenChange}
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