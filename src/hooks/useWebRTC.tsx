import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface WebRTCConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

type SerializablePayload = {
  type?: string;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
    usernameFragment: string | null;
  };
};

export const useWebRTC = ({ channelId, onTrack }: WebRTCConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);

  const handleError = (error: Error, context: string) => {
    console.error(`WebRTC Error (${context}):`, error);
    setError(error.message);
    toast.error(`Voice chat error: ${error.message}`);
  };

  const createPeerConnection = async (participantId: string) => {
    try {
      console.log('Creating peer connection for participant:', participantId);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:global.turn.twilio.com:3478?transport=udp',
            username: 'your_username',
            credential: 'your_credential'
          }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 1
      });

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            console.log('New ICE candidate:', event.candidate);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const payload: SerializablePayload = {
              candidate: {
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                usernameFragment: event.candidate.usernameFragment
              }
            };

            await supabase.from('voice_signaling').insert({
              channel_id: channelId,
              sender_id: user.id,
              receiver_id: participantId,
              type: 'ice-candidate',
              payload: payload as Json
            });
          } catch (error) {
            handleError(error as Error, 'ICE candidate signaling');
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${participantId}:`, pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.log('Connection failed, attempting to reconnect...');
          pc.restartIce();
          toast.warning('Voice connection unstable, attempting to reconnect...');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${participantId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected') {
          toast.warning('Voice connection unstable, attempting to reconnect...');
        }
      };

      if (localStream.current) {
        console.log('Adding local tracks to peer connection');
        localStream.current.getTracks().forEach(track => {
          if (localStream.current) {
            console.log('Adding track:', track.kind);
            pc.addTrack(track, localStream.current);
          }
        });
      }

      pc.onnegotiationneeded = async () => {
        try {
          console.log('Negotiation needed, creating offer...');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          });
          await pc.setLocalDescription(offer);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const payload: SerializablePayload = {
            type: offer.type,
            sdp: offer.sdp
          };

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: user.id,
            receiver_id: participantId,
            type: 'offer',
            payload: payload as Json
          });
        } catch (error) {
          handleError(error as Error, 'Negotiation');
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote track from:', participantId);
        onTrack?.(event, participantId);
      };

      peerConnections.current.set(participantId, pc);
      return pc;
    } catch (error) {
      handleError(error as Error, 'Peer connection creation');
      return null;
    }
  };

  const handleSignalingMessage = async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let pc = peerConnections.current.get(sender_id);
      
      if (!pc) {
        console.log('Creating new peer connection for sender:', sender_id);
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

      switch (type) {
        case 'offer':
          console.log('Processing offer from:', sender_id);
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: payload.type,
            sdp: payload.sdp
          }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const answerPayload: SerializablePayload = {
            type: answer.type,
            sdp: answer.sdp
          };

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: user.id,
            receiver_id: sender_id,
            type: 'answer',
            payload: answerPayload as Json
          });
          break;

        case 'answer':
          console.log('Processing answer from:', sender_id);
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: payload.type,
            sdp: payload.sdp
          }));
          break;

        case 'ice-candidate':
          console.log('Processing ICE candidate from:', sender_id);
          if (payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
          break;
      }
    } catch (error) {
      handleError(error as Error, 'Signaling message handling');
    }
  };

  const initializeWebRTC = async () => {
    try {
      console.log('Initializing WebRTC');
      
      if (!navigator.mediaDevices || !window.RTCPeerConnection) {
        throw new Error('WebRTC is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        },
        video: false
      });
      
      localStream.current = stream;
      setIsInitialized(true);
      setError(null);
      console.log('WebRTC initialized successfully');
    } catch (error) {
      handleError(error as Error, 'WebRTC initialization');
      throw error;
    }
  };

  const cleanup = () => {
    console.log('Cleaning up WebRTC resources');
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStream.current = null;
    }

    peerConnections.current.forEach(pc => {
      pc.close();
    });
    peerConnections.current.clear();
    setIsInitialized(false);
    setError(null);
  };

  useEffect(() => {
    console.log('Setting up voice signaling subscription');
    const channel = supabase
      .channel(`voice-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_signaling',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        console.log('Received voice signaling message:', payload);
        handleSignalingMessage(payload.new);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log('Voice signaling subscription established');
        }
      });

    return () => {
      console.log('Cleaning up voice signaling subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return {
    isInitialized,
    error,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};
