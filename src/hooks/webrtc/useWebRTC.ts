import { useState, useRef, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useSignaling } from './useSignaling';
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
  const peers = useRef<Map<string, SimplePeer.Instance>>(new Map());

  const handleSignalingMessage = useCallback(async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let peer = peers.current.get(sender_id);

      if (!peer && localStream.current) {
        peer = new SimplePeer({
          initiator: false,
          stream: localStream.current,
          trickle: false,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        peer.on('signal', (data) => {
          sendSignal(sender_id, 'answer', data);
        });

        peer.on('connect', () => {
          console.log('Peer connected:', sender_id);
          setConnectionState('connected');
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError(err.message);
          peer?.destroy();
          peers.current.delete(sender_id);
        });

        peer.on('track', (track, stream) => {
          console.log('Received track:', track.kind);
          onTrack?.({ track, streams: [stream] } as RTCTrackEvent, sender_id);
        });

        peers.current.set(sender_id, peer);
      }

      if (peer && type === 'offer') {
        peer.signal(payload);
      }
    } catch (error: any) {
      console.error('Error handling signaling message:', error);
      toast.error(`Connection error: ${error.message}`);
      setError(error.message);
    }
  }, [onTrack]);

  const { sendSignal } = useSignaling({
    channelId,
    onSignalingMessage: handleSignalingMessage
  });

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

    peers.current.forEach(peer => {
      peer.destroy();
    });
    peers.current.clear();
    
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