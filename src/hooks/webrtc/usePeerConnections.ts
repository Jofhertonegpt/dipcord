import { useRef, useCallback } from 'react';

interface PeerConnectionsConfig {
  channelId: string;
  localStream: MediaStream | null;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export const usePeerConnections = ({
  channelId,
  localStream,
  onTrack,
  onConnectionStateChange
}: PeerConnectionsConfig) => {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

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

      pc.onconnectionstatechange = () => {
        console.log(`[ICE] Connection state with ${participantId}:`, pc.connectionState);
        onConnectionStateChange?.(pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.error('Connection failed with participant:', participantId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[ICE] ICE Connection state with ${participantId}:`, pc.iceConnectionState);
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

      // Process any pending ICE candidates for this peer
      const candidates = pendingIceCandidates.current.get(participantId) || [];
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIceCandidates.current.delete(participantId);

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }, [channelId, localStream, onTrack]);

  return {
    peerConnections: peerConnections.current,
    createPeerConnection,
    pendingIceCandidates: pendingIceCandidates.current
  };
};