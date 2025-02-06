import { useState, useRef, useEffect } from 'react';
import { useTurnServers } from './useTurnServers';
import { useVoipSignaling } from './useVoipSignaling';
import { toast } from 'sonner';

interface WebRTCConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

export const useWebRTC = ({ channelId, onTrack }: WebRTCConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { data: iceServers } = useTurnServers();

  const { sendSignal } = useVoipSignaling({
    channelId,
    onSignal: async (message) => {
      try {
        const { sender_id, type, payload } = message;
        console.log('Handling VOIP signal:', { type, sender_id });
        
        let pc = peerConnections.current.get(sender_id);

        if (!pc && (type === 'offer' || type === 'answer')) {
          if (!iceServers) {
            throw new Error('ICE servers not available');
          }

          pc = new RTCPeerConnection({ iceServers });
          setupPeerConnection(pc, sender_id);
          peerConnections.current.set(sender_id, pc);
        }

        if (!pc) return;

        switch (type) {
          case 'offer':
            await handleOffer(pc, sender_id, payload);
            break;
          case 'answer':
            await handleAnswer(pc, payload);
            break;
          case 'ice-candidate':
            await handleIceCandidate(pc, payload);
            break;
        }
      } catch (error: any) {
        console.error('Error handling VOIP signal:', error);
        toast.error('Error in voice connection');
      }
    }
  });

  const setupPeerConnection = (pc: RTCPeerConnection, participantId: string) => {
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.error(`Connection failed with ${participantId}`);
        toast.error('Voice connection failed');
        pc.close();
        peerConnections.current.delete(participantId);
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received track from ${participantId}:`, event.track.kind);
      onTrack?.(event, participantId);
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        if (localStream.current) {
          pc.addTrack(track, localStream.current);
        }
      });
    }

    return pc;
  };

  const handleOffer = async (pc: RTCPeerConnection, senderId: string, payload: any) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(senderId, 'answer', answer);
    } catch (error: any) {
      console.error('Error handling offer:', error);
      toast.error(`Failed to process connection offer: ${error.message}`);
      throw error;
    }
  };

  const handleAnswer = async (pc: RTCPeerConnection, payload: any) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
    } catch (error: any) {
      console.error('Error handling answer:', error);
      toast.error(`Failed to process connection answer: ${error.message}`);
      throw error;
    }
  };

  const handleIceCandidate = async (pc: RTCPeerConnection, payload: any) => {
    try {
      if (payload) {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      }
    } catch (error: any) {
      console.error('Error adding ICE candidate:', error);
      toast.error(`Failed to establish connection path: ${error.message}`);
      throw error;
    }
  };

  const initializeWebRTC = async () => {
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
      
      localStream.current = stream;
      setIsInitialized(true);
      setError(null);
    } catch (error: any) {
      console.error('WebRTC initialization error:', error);
      setError(error.message);
      toast.error(`Failed to initialize voice: ${error.message}`);
      throw error;
    }
  };

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
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
    return cleanup;
  }, []);

  return {
    isInitialized,
    error,
    connectionState,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};