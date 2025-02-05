import { useRef, useCallback } from 'react';
import { useIceServers } from './useIceServers';
import { useSignaling } from './useSignaling';

interface PeerConnectionsConfig {
  channelId: string;
  localStream: MediaStream | null;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

export const usePeerConnections = ({ 
  channelId, 
  localStream, 
  onTrack 
}: PeerConnectionsConfig) => {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const { data: iceServers } = useIceServers();

  const processPendingIceCandidates = async (pc: RTCPeerConnection, participantId: string) => {
    const candidates = pendingIceCandidates.current.get(participantId) || [];
    console.log(`Processing ${candidates.length} pending ICE candidates for ${participantId}`);
    
    for (const candidate of candidates) {
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`Successfully added pending ICE candidate for ${participantId}`);
        } else {
          console.log(`Skipping ICE candidate - remote description not set for ${participantId}`);
          continue;
        }
      } catch (error) {
        console.error(`Failed to add pending ICE candidate for ${participantId}:`, error);
      }
    }
    
    pendingIceCandidates.current.delete(participantId);
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
        console.log(`[ICE] Gathering state:`, pc.iceGatheringState);
        console.log(`[ICE] Signaling state:`, pc.signalingState);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log(`[ICE] New candidate for ${participantId}`);
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
      return null;
    }
  }, [channelId, iceServers, localStream, onTrack]);

  return {
    peerConnections: peerConnections.current,
    createPeerConnection,
    processPendingIceCandidates,
    pendingIceCandidates: pendingIceCandidates.current
  };
};