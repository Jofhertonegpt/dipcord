import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VoiceSignal } from '@/types/database';

interface UseVoipSignalingProps {
  channelId: string;
  onSignal: (signal: VoiceSignal) => void;
}

export const useVoipSignaling = ({ channelId, onSignal }: UseVoipSignalingProps) => {
  useEffect(() => {
    const channel = supabase.channel(`voice-${channelId}`)
      .on(
        'broadcast',
        { event: 'voice-signal' },
        (payload) => {
          console.log('Received VOIP signal:', payload);
          onSignal(payload.payload as VoiceSignal);
        }
      )
      .subscribe(status => {
        console.log('VOIP signaling subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          toast.error('Failed to connect to VOIP signaling');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, onSignal]);

  const sendSignal = async (receiverId: string | null, type: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.channel(`voice-${channelId}`).send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: {
          channel_id: channelId,
          sender_id: user.id,
          receiver_id: receiverId,
          type,
          payload
        }
      });
    } catch (error: any) {
      console.error('Error sending VOIP signal:', error);
      toast.error(`Failed to send VOIP signal: ${error.message}`);
      throw error;
    }
  };

  return { sendSignal };
};