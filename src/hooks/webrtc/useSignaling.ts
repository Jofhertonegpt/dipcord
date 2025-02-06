import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface SignalingConfig {
  channelId: string;
  onSignalingMessage: (message: any) => void;
}

export const useSignaling = ({ channelId, onSignalingMessage }: SignalingConfig) => {
  const signalingError = useRef<string | null>(null);

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

    return () => {
      console.log('Cleaning up voice signaling subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, onSignalingMessage]);

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