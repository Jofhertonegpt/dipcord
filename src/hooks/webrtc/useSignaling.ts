/**
 * Custom hook for managing WebRTC signaling using Supabase's real-time features.
 * Handles the exchange of connection information between peers in a voice channel.
 */
import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface SignalingConfig {
  channelId: string;
  onSignalingMessage: (message: any) => void;
}

export const useSignaling = ({ channelId, onSignalingMessage }: SignalingConfig) => {
  // Track signaling errors without triggering re-renders
  const signalingError = useRef<string | null>(null);

  useEffect(() => {
    console.log('Setting up voice signaling subscription');
    
    /**
     * Subscribe to Supabase real-time changes for voice signaling.
     * Listens for new signaling messages in the voice_signaling table
     * and forwards them to the message handler.
     */
    const channel = supabase
      .channel(`voice-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_signaling',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        try {
          console.log('Received voice signaling message:', payload);
          onSignalingMessage(payload.new);
        } catch (error: any) {
          console.error('Error processing signaling message:', error);
          signalingError.current = error.message;
          toast.error(`Signaling error: ${error.message}`);
        }
      })
      .subscribe(status => {
        console.log('Voice signaling subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          signalingError.current = 'Failed to connect to signaling server';
          toast.error('Failed to connect to voice server');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up voice signaling subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, onSignalingMessage]);

  /**
   * Sends a signaling message to a specific peer.
   * Used for exchanging WebRTC connection information (offers, answers, ICE candidates).
   * 
   * @param receiverId - ID of the peer to send the message to
   * @param type - Type of signaling message (offer, answer, ice-candidate)
   * @param payload - The actual signaling data to send
   */
  const sendSignal = async (receiverId: string, type: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('voice_signaling').insert({
        channel_id: channelId,
        sender_id: user.id,
        receiver_id: receiverId,
        type,
        payload: payload as Json
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending signal:', error);
      signalingError.current = error.message;
      toast.error(`Failed to send voice signal: ${error.message}`);
      throw error;
    }
  };

  return { 
    sendSignal,
    signalingError: signalingError.current
  };
};