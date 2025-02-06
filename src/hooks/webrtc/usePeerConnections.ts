import { useRef, useCallback } from 'react';
import { useIceServers } from './useIceServers';
import { useSignaling } from './useSignaling';

interface PeerConnectionsConfig {
  channelId: string;
  localStream: MediaStream | null;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
  onError?: (error: Error) => void;
}

export const usePeerConnections = ({
  channelId,
  localStream,
  onTrack,
  onError
}: PeerConnectionsConfig) => {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const connectionState = useRef<Map<string, RTCPeerConnectionState>>(new Map());
  const { data: iceServers } = useIceServers();

  const handleConnectionStateChange = (pc: RTCPeerConnection, participantId: string) => {
    const state = pc.connectionState;
    connectionState.current.set(participantId, state);
    console.log(`Connection state with ${participantId}:`, state);

    if (state === 'failed' || state === 'disconnected') {
      onError?.(new Error(`Connection ${state} with participant ${participantId}`));
    }
  };

  const createPeerConnection = useCallback(async (participantId: string) => {
    try {
      if (!iceServers) throw new Error('ICE servers not available');
      
      console.log('Creating peer connection for participant:', participantId);
      
      const pc = new RTCPeerConnection({
        iceServers,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 1
      });

      pc.oniceconnectionstatechange = () => {
        console.log(`[ICE] Connection state with ${participantId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          onError?.(new Error('ICE connection failed'));
        }
      };

      pc.onconnectionstatechange = () => handleConnectionStateChange(pc, participantId);

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log(`[ICE] New candidate for ${participantId}`);
          try {
            const { sendSignal } = useSignaling({ 
              channelId, 
              onSignalingMessage: () => {} 
            });
            
            await sendSignal(participantId, 'ice-candidate', {
              candidate: {
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                usernameFragment: event.candidate.usernameFragment
              }
            });
          } catch (error) {
            console.error('Error sending ICE candidate:', error);
            onError?.(new Error('Failed to send ICE candidate'));
          }
        }
      };

      pc.ontrack = (event) => {
        console.log(`[ICE] Received remote track from ${participantId}`);
        onTrack?.(event, participantId);
      };

      if (localStream) {
        console.log('[ICE] Adding local tracks to peer connection');
        localStream.getTracks().forEach(track => {
          if (localStream) {
            pc.addTrack(track, localStream);
          }
        });
      }

      peerConnections.current.set(participantId, pc);
      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      onError?.(new Error('Failed to create peer connection'));
      return null;
    }
  }, [channelId, iceServers, onTrack, onError]);

  return {
    peerConnections: peerConnections.current,
    connectionState: connectionState.current,
    createPeerConnection,
    processPendingIceCandidates,
    pendingIceCandidates: pendingIceCandidates.current
  };
};