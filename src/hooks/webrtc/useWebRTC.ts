import { useState, useRef } from 'react';
import { useAudioAnalysis } from './useAudioAnalysis';
import { usePeerConnections } from './usePeerConnections';
import { useSignaling } from './useSignaling';
import { toast } from 'sonner';

interface WebRTCConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

export const useWebRTC = ({ channelId, onTrack }: WebRTCConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const { 
    peerConnections, 
    createPeerConnection, 
    processPendingIceCandidates,
    pendingIceCandidates,
    connectionState 
  } = usePeerConnections({ 
    channelId, 
    localStream: localStream.current, 
    onTrack,
    onError: (error) => {
      console.error('Peer connection error:', error);
      toast.error(`Connection error: ${error.message}`);
    }
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
        if (!pc) {
          throw new Error('Failed to create peer connection');
        }
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
        default:
          console.warn('Unknown signaling message type:', type);
      }
    } catch (error: any) {
      console.error('Error handling signaling message:', error);
      toast.error(`Connection error: ${error.message}`);
      setError(error.message);
    }
  };

  const { sendSignal, signalingError } = useSignaling({ 
    channelId, 
    onSignalingMessage: handleSignalingMessage 
  });

  const handleOffer = async (pc: RTCPeerConnection, senderId: string, payload: any) => {
    try {
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
    } catch (error: any) {
      console.error('Error handling offer:', error);
      toast.error(`Failed to process connection offer: ${error.message}`);
      throw error;
    }
  };

  const handleAnswer = async (pc: RTCPeerConnection, payload: any) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: payload.type,
        sdp: payload.sdp
      }));
    } catch (error: any) {
      console.error('Error handling answer:', error);
      toast.error(`Failed to process connection answer: ${error.message}`);
      throw error;
    }
  };

  const handleIceCandidate = async (pc: RTCPeerConnection, payload: any) => {
    if (!payload.candidate) {
      console.log('Skipping null ICE candidate');
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      console.log('Successfully added ICE candidate');
    } catch (error: any) {
      console.error('Error adding ICE candidate:', error);
      toast.error(`Failed to establish connection path: ${error.message}`);
      throw error;
    }
  };

  const initializeWebRTC = async () => {
    try {
      console.log('Initializing WebRTC');
      
      if (!navigator.mediaDevices || !window.RTCPeerConnection) {
        throw new Error('WebRTC is not supported in this browser');
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream.current = stream;
        
        // Verify audio tracks
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No audio track available in the stream');
        }
        
        console.log('Audio tracks:', audioTracks.map(track => ({
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        })));

        setIsInitialized(true);
        setError(null);
        console.log('WebRTC initialized successfully');
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw error;
        }
      }
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

    peerConnections.forEach((pc, id) => {
      console.log(`Closing peer connection with ${id}`);
      pc.close();
    });
    
    setIsInitialized(false);
    setError(null);
  };

  return {
    isInitialized,
    error,
    connectionState,
    signalingError,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};