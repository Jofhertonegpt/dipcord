import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VoipSession } from '@/types/database';

interface UseVoipSessionProps {
  channelId: string;
}

export const useVoipSession = ({ channelId }: UseVoipSessionProps) => {
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['voip-session', channelId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('voip_sessions')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as VoipSession;
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('voip_sessions')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          connection_state: 'connecting'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voip-session', channelId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create VOIP session: ${error.message}`);
    }
  });

  const updateSession = useMutation({
    mutationFn: async (updates: Partial<VoipSession>) => {
      if (!session?.id) throw new Error('No active session');

      const { error } = await supabase
        .from('voip_sessions')
        .update(updates)
        .eq('id', session.id);

      if (error) throw error;
    },
    onError: (error: Error) => {
      toast.error(`Failed to update VOIP session: ${error.message}`);
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (session?.id) {
        updateSession.mutate({ connection_state: 'disconnected' });
      }
    };
  }, [session?.id]);

  return {
    session,
    createSession: createSession.mutate,
    updateSession: updateSession.mutate
  };
};