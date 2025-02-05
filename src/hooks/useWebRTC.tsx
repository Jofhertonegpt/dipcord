import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface WebRTCConfig {
  channelId: string;
  onTrack?: (event: RTCTrackEvent, participantId: string) => void;
}

type SerializablePayload = {
  type?: string;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
    usernameFragment: string | null;
  };
};

export const useWebRTC = ({ channelId, onTrack }: WebRTCConfig) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const handleError = (error: Error, context: string) => {
    console.error(`WebRTC Error (${context}):`, error);
    setError(error.message);
    toast.error(`Voice chat error: ${error.message}`);
  };

  const fetchIceServers = async () => {
    try {
      console.log('Fetching ICE servers...');
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      const { data: customServers, error } = await supabase
        .from('ice_servers')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Error fetching ICE servers:', error);
        return defaultServers;
      }

      if (!customServers?.length) {
        console.log('Using default STUN servers');
        return defaultServers;
      }

      console.log('Using custom ICE servers:', customServers);
      return customServers.map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential
      }));
    } catch (error) {
      console.error('Error in fetchIceServers:', error);
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  };

  const processPendingIceCandidates = async (pc: RTCPeerConnection, participantId: string) => {
    const candidates = pendingIceCandidates.current.get(participantId) || [];
    console.log(`Processing ${candidates.length} pending ICE candidates for ${participantId}`);
    
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`Added pending ICE candidate for ${participantId}`);
      } catch (error) {
        console.error(`Failed to add pending ICE candidate for ${participantId}:`, error);
      }
    }
    
    pendingIceCandidates.current.delete(participantId);
  };

  const createPeerConnection = async (participantId: string) => {
    try {
      console.log('Creating peer connection for participant:', participantId);
      
      const iceServers = await fetchIceServers();
      console.log('Using ICE servers:', iceServers);
      
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
          console.log(`[ICE] New candidate for ${participantId}:`, {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port
          });
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const payload: SerializablePayload = {
              candidate: {
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                usernameFragment: event.candidate.usernameFragment
              }
            };

            await supabase.from('voice_signaling').insert({
              channel_id: channelId,
              sender_id: user.id,
              receiver_id: participantId,
              type: 'ice-candidate',
              payload: payload as Json
            });
            
            console.log(`[ICE] Candidate sent to ${participantId}`);
          } catch (error) {
            console.error(`[ICE] Failed to send candidate:`, error);
          }
        }
      };

      pc.ontrack = (event) => {
        console.log(`[ICE] Received remote track from ${participantId}:`, {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          muted: event.track.muted
        });
        onTrack?.(event, participantId);
      };

      if (localStream.current) {
        console.log('[ICE] Adding local tracks to peer connection');
        localStream.current.getTracks().forEach(track => {
          if (localStream.current) {
            console.log('[ICE] Adding track:', {
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted
            });
            pc.addTrack(track, localStream.current);
          }
        });
      }

      peerConnections.current.set(participantId, pc);
      await processPendingIceCandidates(pc, participantId);
      return pc;
    } catch (error) {
      handleError(error as Error, 'Peer connection creation');
      return null;
    }
  };

  const handleSignalingMessage = async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let pc = peerConnections.current.get(sender_id);
      
      if (type === 'ice-candidate' && !pc) {
        console.log('Storing ICE candidate for later processing');
        const candidates = pendingIceCandidates.current.get(sender_id) || [];
        candidates.push(payload.candidate);
        pendingIceCandidates.current.set(sender_id, candidates);
        return;
      }

      if (!pc && (type === 'offer' || type === 'answer')) {
        console.log('Creating new peer connection for sender:', sender_id);
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

      switch (type) {
        case 'offer':
          console.log('Processing offer from:', sender_id);
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
          console.log('Processing answer from:', sender_id);
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: payload.type,
            sdp: payload.sdp
          }));
          break;

        case 'ice-candidate':
          console.log('Processing ICE candidate from:', sender_id);
          if (payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              console.log('Successfully added ICE candidate');
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
          break;
      }
    } catch (error) {
      handleError(error as Error, 'Signaling message handling');
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
    } catch (error) {
      handleError(error as Error, 'WebRTC initialization');
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

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (audioAnalyser.current) {
      audioAnalyser.current.disconnect();
      audioAnalyser.current = null;
    }

    peerConnections.current.forEach(pc => {
      pc.close();
    });
    peerConnections.current.clear();
    setIsInitialized(false);
    setError(null);
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
      .subscribe(status => {
        console.log('Voice signaling subscription status:', status);
      });

    return () => {
      console.log('Cleaning up voice signaling subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return {
    isInitialized,
    error,
    initializeWebRTC,
    cleanup,
    localStream: localStream.current
  };
};
