import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VoiceSignal } from '@/types/database';

interface VoiceChatConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

export const useVoiceChat = ({ channelId, onTrack }: VoiceChatConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const { data: iceServers } = useQuery({
    queryKey: ['ice-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ice_servers')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching ICE servers:', error);
        return [{ urls: 'stun:stun.l.google.com:19302' }];
      }

      return data.map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential
      }));
    }
  });

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`voice-${channelId}`)
      .on(
        'broadcast',
        { event: 'voice-signal' },
        async (payload: { type: string; data: VoiceSignal }) => {
          try {
            const { sender_id, type, payload: signalPayload } = payload.data;
            
            // Don't process our own messages
            const { data: { user } } = await supabase.auth.getUser();
            if (sender_id === user?.id) return;

            console.log('Received voice signal:', { type, sender_id });
            
            let pc = peerConnectionsRef.current.get(sender_id);

            if (!pc && (type === 'offer' || type === 'answer')) {
              pc = await createPeerConnection(sender_id);
            }

            if (!pc) return;

            switch (type) {
              case 'offer':
                await handleOffer(pc, sender_id, signalPayload);
                break;
              case 'answer':
                await handleAnswer(pc, signalPayload);
                break;
              case 'ice-candidate':
                await handleIceCandidate(pc, signalPayload);
                break;
            }
          } catch (error) {
            console.error('Error handling voice signal:', error);
            toast.error('Error in voice connection');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const createPeerConnection = async (participantId: string) => {
    if (!iceServers) {
      throw new Error('ICE servers not available');
    }

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal(participantId, 'ice-candidate', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.error(`Connection failed with ${participantId}`);
        toast.error('Voice connection failed');
        pc.close();
        peerConnectionsRef.current.delete(participantId);
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received track from ${participantId}:`, event.track.kind);
      onTrack?.(event, participantId);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    peerConnectionsRef.current.set(participantId, pc);
    return pc;
  };

  const sendSignal = async (receiverId: string, type: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('voice_signaling').insert({
        channel_id: channelId,
        sender_id: user.id,
        receiver_id: receiverId,
        type,
        payload
      });
    } catch (error) {
      console.error('Error sending signal:', error);
      throw error;
    }
  };

  const handleOffer = async (pc: RTCPeerConnection, senderId: string, payload: RTCSessionDescriptionInit) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(senderId, 'answer', answer);
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  };

  const handleAnswer = async (pc: RTCPeerConnection, payload: RTCSessionDescriptionInit) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  };

  const handleIceCandidate = async (pc: RTCPeerConnection, payload: RTCIceCandidateInit) => {
    try {
      if (payload) {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      throw error;
    }
  };

  const initialize = async () => {
    try {
      if (!navigator.mediaDevices || !window.RTCPeerConnection) {
        throw new Error('WebRTC is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      localStreamRef.current = stream;
      setIsInitialized(true);
      setError(null);
    } catch (error: any) {
      console.error('Voice chat initialization error:', error);
      setError(error.message);
      toast.error(`Failed to initialize voice: ${error.message}`);
      throw error;
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    setIsInitialized(false);
    setError(null);
  };

  return {
    isInitialized,
    error,
    connectionState,
    initialize,
    cleanup,
    localStream: localStreamRef.current
  };
};
