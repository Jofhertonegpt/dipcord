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
    const channel = supabase
      .channel(`voice-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_signaling',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('Received VOIP signal:', payload);
          onSignal(payload.new as VoiceSignal);
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

      const { error } = await supabase
        .from('voice_signaling')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          receiver_id: receiverId,
          type,
          payload
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending VOIP signal:', error);
      toast.error(`Failed to send VOIP signal: ${error.message}`);
      throw error;
    }
  };

  return { sendSignal };
};