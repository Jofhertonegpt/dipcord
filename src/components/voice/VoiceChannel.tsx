import { useEffect, useRef, useState } from "react";
import { VoiceParticipantList } from "./VoiceParticipantList";
import { VoiceControls } from "./VoiceControls";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel = ({ channelId }: VoiceChannelProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  const queryClient = useQueryClient();

  // Check if user is already in the channel
  const { data: existingParticipant } = useQuery({
    queryKey: ['voice-participant', channelId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('voice_channel_participants')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  const joinChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (existingParticipant) {
        return existingParticipant;
      }

      const { data, error } = await supabase
        .from('voice_channel_participants')
        .insert([
          {
            channel_id: channelId,
            user_id: user.id,
            is_muted: false,
            is_deafened: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
      queryClient.invalidateQueries({ queryKey: ['voice-participant', channelId] });
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
      queryClient.invalidateQueries({ queryKey: ['voice-participant', channelId] });
      toast.success("Left voice channel");
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave channel: ${error.message}`);
    },
  });

  const handleIncomingTrack = (event: RTCTrackEvent, participantId: string) => {
    const [stream] = event.streams;
    if (!stream) return;

    remoteStreams.current.set(participantId, stream);
    let audio = audioElements.current.get(participantId);
    
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      audioElements.current.set(participantId, audio);
    }
    
    audio.srcObject = stream;
  };

  const initializeVoiceChat = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Get TURN server credentials from Supabase Edge Function
      const { data: iceServers, error } = await supabase.functions.invoke('get-turn-credentials');
      
      if (error) {
        throw new Error('Failed to get TURN credentials');
      }

      peerConnection.current = new RTCPeerConnection({ 
        iceServers: iceServers || [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      });

      // Add local tracks to the peer connection
      localStream.current.getTracks().forEach((track) => {
        if (peerConnection.current && localStream.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      // Handle incoming tracks
      peerConnection.current.ontrack = async (event) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          handleIncomingTrack(event, user.id);
        } catch (error) {
          console.error("Error handling incoming track:", error);
        }
      };

      // Set up ICE candidate handling
      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("New ICE candidate:", event.candidate);
        }
      };

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
    audioElements.current.forEach((audio) => {
      audio.muted = isDeafened;
    });
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

    // Clean up audio elements
    audioElements.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    audioElements.current.clear();
    remoteStreams.current.clear();

    if (isConnected) {
      await leaveChannel.mutateAsync();
    }
    setIsConnected(false);
  };

  useEffect(() => {
    if (existingParticipant) {
      setIsConnected(true);
    }

    return () => {
      cleanup();
    };
  }, [existingParticipant]);

  // Set up real-time updates for voice participants
  useEffect(() => {
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

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