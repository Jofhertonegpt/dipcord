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
      console.log('Creating peer connection for participant:', participantId);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add local tracks to the peer connection
      if (localStream.current) {
        console.log('Adding local tracks to peer connection');
        localStream.current.getTracks().forEach(track => {
          if (localStream.current) {
            pc.addTrack(track, localStream.current);
          }
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
          
          // Convert RTCIceCandidate to a plain object
          const candidateJson = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment
          } as Json;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: user.id,
            receiver_id: participantId,
            type: 'ice-candidate',
            payload: candidateJson
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log('Received remote track');
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
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let pc = peerConnections.current.get(sender_id);
      
      if (!pc) {
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

      switch (type) {
        case 'offer':
          console.log('Processing offer');
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: user.id,
            receiver_id: sender_id,
            type: 'answer',
            payload: {
              type: answer.type,
              sdp: answer.sdp
            } as Json
          });
          break;

        case 'answer':
          console.log('Processing answer');
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          break;

        case 'ice-candidate':
          console.log('Processing ICE candidate');
          if (payload) {
            const candidate = new RTCIceCandidate({
              candidate: payload.candidate,
              sdpMLineIndex: payload.sdpMLineIndex,
              sdpMid: payload.sdpMid,
              usernameFragment: payload.usernameFragment
            });
            await pc.addIceCandidate(candidate);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const initializeWebRTC = async () => {
    try {
      console.log('Initializing WebRTC');
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      setIsInitialized(true);
      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
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

    peerConnections.current.forEach(pc => {
      pc.close();
      console.log('Closed peer connection');
    });
    peerConnections.current.clear();
    setIsInitialized(false);
  };

  useEffect(() => {
    console.log('Setting up voice signaling subscription');
    const channel = supabase
      .channel(`voice-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_signaling',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        console.log('Received voice signaling message:', payload);
        handleSignalingMessage(payload.new);
      })
      .subscribe();

    return () => {
      console.log('Cleaning up voice signaling subscription');
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