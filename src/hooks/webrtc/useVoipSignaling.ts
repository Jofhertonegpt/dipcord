import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VoipSignal } from '@/types/database';

interface UseVoipSignalingProps {
  sessionId: string;
  onSignal: (signal: VoipSignal) => void;
}

export const useVoipSignaling = ({ sessionId, onSignal }: UseVoipSignalingProps) => {
  useEffect(() => {
    const channel = supabase
      .channel(`voip-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voip_signaling',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Received VOIP signal:', payload);
          onSignal(payload.new as VoipSignal);
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
  }, [sessionId, onSignal]);

  const sendSignal = async (receiverId: string | null, type: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('voip_signaling')
        .insert({
          session_id: sessionId,
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