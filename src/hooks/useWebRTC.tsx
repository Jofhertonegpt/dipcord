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

  const handleError = (error: Error, context: string) => {
    console.error(`WebRTC Error (${context}):`, error);
    setError(error.message);
    toast.error(`Voice chat error: ${error.message}`);
  };

  const fetchIceServers = async () => {
    try {
      // Default free STUN servers
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
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
        console.log('No custom ICE servers found, using default STUN servers');
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

  const createPeerConnection = async (participantId: string) => {
    try {
      console.log('Creating peer connection for participant:', participantId);
      
      const iceServers = await fetchIceServers();
      console.log('Using ICE servers:', iceServers);
      
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 1
      });

      // Enhanced ICE connection logging
      pc.oniceconnectionstatechange = () => {
        console.log(`[ICE] Connection state with ${participantId}:`, pc.iceConnectionState);
        console.log(`[ICE] Current candidates:`, pc.localDescription?.sdp);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log(`[ICE] New candidate found:`, {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            candidateType: event.candidate.candidateType
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
            handleError(error as Error, 'ICE candidate signaling');
          }
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`[ICE] Gathering state with ${participantId}:`, pc.iceGatheringState);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[ICE] WebRTC connection state with ${participantId}:`, {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          signalingState: pc.signalingState
        });
      };

      // Handle incoming tracks with enhanced logging
      pc.ontrack = (event) => {
        console.log(`[ICE] Received remote track from ${participantId}:`, {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          muted: event.track.muted
        });
        onTrack?.(event, participantId);
      };

      // Add local tracks with logging
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
      return pc;
    } catch (error) {
      handleError(error as Error, 'Peer connection creation');
      return null;
    }
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      if (!audioContext.current) {
        audioContext.current = new AudioContext();
      }

      const analyser = audioContext.current.createAnalyser();
      analyser.fftSize = 2048;
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        if (average > 30) {
          console.log('Local user is speaking - Audio level:', average.toFixed(2));
        }
        
        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
      audioAnalyser.current = analyser;

    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  };

  const handleSignalingMessage = async (message: any) => {
    const { sender_id, type, payload } = message;
    console.log('Handling signaling message:', { type, sender_id });
    
    try {
      let pc = peerConnections.current.get(sender_id);
      
      if (!pc) {
        console.log('Creating new peer connection for sender:', sender_id);
        pc = await createPeerConnection(sender_id);
        if (!pc) return;
      }

      switch (type) {
        case 'offer':
          console.log('Processing offer from:', sender_id);
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: payload.type,
            sdp: payload.sdp
          }));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const answerPayload: SerializablePayload = {
            type: answer.type,
            sdp: answer.sdp
          };

          await supabase.from('voice_signaling').insert({
            channel_id: channelId,
            sender_id: user.id,
            receiver_id: sender_id,
            type: 'answer',
            payload: answerPayload as Json
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
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
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
      setupAudioAnalysis(stream);
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
        if (status === 'SUBSCRIBED') {
          console.log('Voice signaling subscription established');
        }
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