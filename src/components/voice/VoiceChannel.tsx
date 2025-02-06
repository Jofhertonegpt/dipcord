import { useState, useEffect, useRef } from "react";
import { VoiceParticipantList } from "./VoiceParticipantList";
import { VoiceControls } from "./VoiceControls";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SimplePeer from "simple-peer";
import { Loader2 } from "lucide-react";

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel = ({ channelId }: VoiceChannelProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, SimplePeer.Instance>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const queryClient = useQueryClient();

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

  const joinChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('voice_channel_participants')
        .upsert({
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

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    peers.forEach(peer => peer.destroy());
    setPeers(new Map());
  };

  const initializeVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Could not access microphone");
      throw error;
    }
  };

  useEffect(() => {
    if (isConnected && localStream) {
      const channel = supabase.channel(`voice-${channelId}`)
        .on('broadcast', { event: 'signal' }, async (payload) => {
          const { senderId, signal } = payload.payload;
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user?.id === senderId) return;

          let peer = peers.get(senderId);
          
          if (!peer) {
            peer = new SimplePeer({
              initiator: false,
              stream: localStream,
              trickle: false
            });
            
            peer.on('stream', (remoteStream) => {
              const audio = new Audio();
              audio.srcObject = remoteStream;
              audio.play().catch(console.error);
              audioRefs.current.set(senderId, audio);
            });

            setPeers(new Map(peers.set(senderId, peer)));
          }

          peer.signal(signal);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConnected, localStream, channelId]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveChannel.mutate();
      }
    };
  }, [isConnected]);

  const handleJoinChannel = async () => {
    setIsConnecting(true);
    try {
      const stream = await initializeVoice();
      await joinChannel.mutateAsync();
      setLocalStream(stream);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
    } finally {
      setIsConnecting(false);
    }
  };

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
              audioRefs.current.forEach(audio => {
                audio.muted = isDeafened;
              });
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