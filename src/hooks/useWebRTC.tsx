import { useState, useRef } from 'react';
import { useAudioAnalysis } from './webrtc/useAudioAnalysis';
import { usePeerConnections } from './webrtc/usePeerConnections';
import { useSignaling } from './webrtc/useSignaling';
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

  const { 
    peerConnections, 
    createPeerConnection,
    pendingIceCandidates 
  } = usePeerConnections({ 
    channelId, 
    localStream: localStream.current, 
    onTrack,
    onConnectionStateChange: setConnectionState
  });

  const { checkAudioLevel } = useAudioAnalysis(localStream.current);

  const handleSignalingMessage = async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let pc = peerConnections.get(sender_id);

      if (type === 'ice-candidate' && !pc) {
        console.log('Storing ICE candidate for later processing');
        const candidates = pendingIceCandidates.get(sender_id) || [];
        candidates.push(payload.candidate);
        pendingIceCandidates.set(sender_id, candidates);
        return;
      }

      if (!pc && (type === 'offer' || type === 'answer')) {
        console.log('Creating new peer connection for sender:', sender_id);
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

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
    } catch (error) {
      console.error('Error handling signaling message:', error);
      toast.error('Error in voice connection');
    }
  };

  const { sendSignal } = useSignaling({ 
    channelId, 
    onSignalingMessage: handleSignalingMessage 
  });

  const handleOffer = async (pc: RTCPeerConnection, senderId: string, payload: any) => {
    if (pc.signalingState !== 'stable') {
      console.warn('Skipping offer - connection not stable');
      return;
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: payload.type,
      sdp: payload.sdp
    }));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    await sendSignal(senderId, 'answer', {
      type: answer.type,
      sdp: answer.sdp
    });
  };

  const handleAnswer = async (pc: RTCPeerConnection, payload: any) => {
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: payload.type,
      sdp: payload.sdp
    }));
  };

  const handleIceCandidate = async (pc: RTCPeerConnection, payload: any) => {
    if (payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
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
          autoGainControl: true
        },
        video: false
      });
      
      localStream.current = stream;
      setIsInitialized(true);
      setError(null);
      console.log('WebRTC initialized successfully');
    } catch (error: any) {
      console.error('WebRTC initialization error:', error);
      setError(error.message);
      toast.error(`Failed to initialize voice: ${error.message}`);
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

    peerConnections.forEach(pc => {
      pc.close();
    });
    
    setIsInitialized(false);
    setError(null);
  };

  return {
    isInitialized,
    error,
    connectionState,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};