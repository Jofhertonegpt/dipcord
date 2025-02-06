import { useRef } from 'react';
import { useIceServers } from './useIceServers';
import { toast } from 'sonner';

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
  const { data: iceServers } = useIceServers();

  const createPeerConnection = async (participantId: string) => {
    try {
      if (!iceServers) {
        throw new Error('ICE servers not available');
      }

      console.log(`Creating peer connection for participant ${participantId}`);

      const pc = new RTCPeerConnection({
        iceServers,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 1
      });

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${participantId}:`, pc.connectionState);
        onConnectionStateChange?.(pc.connectionState);
        
        if (pc.connectionState === 'failed') {
          console.error(`Connection failed with ${participantId}`);
          toast.error('Voice connection failed. Please try reconnecting.');
          pc.close();
          peerConnections.current.delete(participantId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE Connection state with ${participantId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.error(`ICE Connection failed with ${participantId}`);
          toast.error('Voice connection failed. Please try reconnecting.');
          pc.close();
          peerConnections.current.delete(participantId);
        }
      };

      pc.ontrack = (event) => {
        console.log(`Received track from ${participantId}:`, event.track.kind);
        onTrack?.(event, participantId);
      };

      if (localStream) {
        console.log('Adding local tracks to peer connection');
        localStream.getTracks().forEach(track => {
          if (localStream) {
            pc.addTrack(track, localStream);
          }
        });
      }

      peerConnections.current.set(participantId, pc);

      // Process any pending ICE candidates
      const candidates = pendingIceCandidates.current.get(participantId) || [];
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIceCandidates.current.delete(participantId);

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      toast.error('Failed to establish voice connection');
      throw error;
    }
  };

  return {
    peerConnections: peerConnections.current,
    createPeerConnection,
    pendingIceCandidates: pendingIceCandidates.current
  };
};