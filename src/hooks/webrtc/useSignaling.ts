import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';

interface SignalingConfig {
  channelId: string;
  onSignalingMessage: (message: any) => void;
}

export const useSignaling = ({ channelId, onSignalingMessage }: SignalingConfig) => {
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
        onSignalingMessage(payload.new);
      })
      .subscribe(status => {
        console.log('Voice signaling subscription status:', status);
      });

    return () => {
      console.log('Cleaning up voice signaling subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, onSignalingMessage]);

  const sendSignal = async (receiverId: string, type: string, payload: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await supabase.from('voice_signaling').insert({
      channel_id: channelId,
      sender_id: user.id,
      receiver_id: receiverId,
      type,
      payload: payload as Json
    });
  };

  return { sendSignal };
};