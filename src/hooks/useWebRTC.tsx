import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface WebRTCConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

export const useWebRTC = ({ channelId, onTrack }: WebRTCConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);

  const createPeerConnection = async (participantId: string) => {
    try {
      // Get TURN server credentials
      const { data: iceServers, error } = await supabase.functions.invoke('get-turn-credentials');
      
      if (error) {
        console.error('Failed to get TURN credentials:', error);
        return null;
      }

      const pc = new RTCPeerConnection({ 
        iceServers: iceServers || [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add local tracks to the peer connection
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          if (localStream.current) {
            pc.addTrack(track, localStream.current);
          }
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Convert RTCIceCandidate to a plain object
          const candidateJson = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment
          } as Json;

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: (await supabase.auth.getUser()).data.user?.id,
            receiver_id: participantId,
            type: 'ice-candidate',
            payload: candidateJson
          });
        }
      };

      // Handle incoming tracks
      pc.ontrack = (event) => {
        onTrack?.(event, participantId);
      };

      peerConnections.current.set(participantId, pc);
      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  };

  const handleSignalingMessage = async (message: any) => {
    const { sender_id, type, payload } = message;
    
    try {
      let pc = peerConnections.current.get(sender_id);
      
      if (!pc) {
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

      switch (type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Convert RTCSessionDescription to a plain object
          const answerJson = {
            type: answer.type,
            sdp: answer.sdp
          } as Json;

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: (await supabase.auth.getUser()).data.user?.id,
            receiver_id: sender_id,
            type: 'answer',
            payload: answerJson
          });
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          break;

        case 'ice-candidate':
          // Convert plain object back to RTCIceCandidate
          const candidate = new RTCIceCandidate({
            candidate: payload.candidate,
            sdpMLineIndex: payload.sdpMLineIndex,
            sdpMid: payload.sdpMid,
            usernameFragment: payload.usernameFragment
          });
          await pc.addIceCandidate(candidate);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const initializeWebRTC = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setIsInitialized(false);
  };

  useEffect(() => {
    const channel = supabase
      .channel(`voice-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_signaling',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        handleSignalingMessage(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return {
    isInitialized,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};