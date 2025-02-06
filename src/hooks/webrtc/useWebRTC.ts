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
  const localStreamRef = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, SimplePeer.Instance>>(new Map());

  // Move useSignaling hook before createPeer to avoid the declaration order issue
  const { sendSignal } = useSignaling({
    channelId,
    onSignalingMessage: handleSignalingMessage
  });

  const createPeer = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStreamRef.current) {
      console.error('Cannot create peer without local stream');
      return null;
    }

    console.log(`Creating ${initiator ? 'initiator' : 'receiver'} peer for ${participantId}`);
    
    const peer = new SimplePeer({
      initiator,
      stream: localStreamRef.current,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('Sending signal to:', participantId);
      sendSignal(participantId, initiator ? 'offer' : 'answer', data);
    });

    peer.on('connect', () => {
      console.log('Peer connected:', participantId);
      setConnectionState('connected');
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      toast.error(`Connection error with peer: ${err.message}`);
      peer?.destroy();
      peers.current.delete(participantId);
    });

    peer.on('track', (track, stream) => {
      console.log('Received track:', track.kind, 'from:', participantId);
      if (onTrack) {
        onTrack({
          track,
          streams: [stream],
          receiver: {} as RTCRtpReceiver,
          transceiver: {} as RTCRtpTransceiver,
          type: 'track',
          bubbles: false,
          cancelBubble: false,
          cancelable: false,
          composed: false,
          currentTarget: null,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: true,
          returnValue: true,
          srcElement: null,
          target: null,
          timeStamp: Date.now(),
          AT_TARGET: 2,
          BUBBLING_PHASE: 3,
          CAPTURING_PHASE: 1,
          NONE: 0,
          composedPath: () => [],
          initEvent: () => {},
          preventDefault: () => {},
          stopImmediatePropagation: () => {},
          stopPropagation: () => {},
        } as RTCTrackEvent, participantId);
      }
    });

    peers.current.set(participantId, peer);
    return peer;
  }, [onTrack, sendSignal]);

  const handleSignalingMessage = useCallback(async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let peer = peers.current.get(sender_id);

      if (type === 'offer') {
        if (peer) {
          console.log('Destroying existing peer for new offer');
          peer.destroy();
        }
        peer = createPeer(sender_id, false);
      }

      if (peer && (type === 'offer' || type === 'answer')) {
        console.log('Signaling peer:', type);
        peer.signal(payload);
      }
    } catch (error: any) {
      console.error('Error handling signaling message:', error);
      toast.error(`Signaling error: ${error.message}`);
    }
  }, [createPeer]);

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
      
      localStreamRef.current = stream;
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
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
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
    localStream: localStreamRef.current,
    createPeer
  };
};