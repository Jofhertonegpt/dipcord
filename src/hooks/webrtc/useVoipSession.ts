import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoipSession {
  id: string;
  channel_id: string;
  user_id: string;
  connection_state: string;
  is_muted: boolean;
  is_deafened: boolean;
  last_heartbeat: string;
}

export const useVoipSession = (channelId: string) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current session
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

  // Create session
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
    onSuccess: (data) => {
      setSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['voip-session', channelId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create VOIP session: ${error.message}`);
    }
  });

  // Update session
  const updateSession = useMutation({
    mutationFn: async (updates: Partial<VoipSession>) => {
      if (!sessionId) throw new Error('No active session');

      const { error } = await supabase
        .from('voip_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
    },
    onError: (error: Error) => {
      toast.error(`Failed to update VOIP session: ${error.message}`);
    }
  });

  // Heartbeat
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      updateSession.mutate({ last_heartbeat: new Date().toISOString() });
    }, 15000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        updateSession.mutate({ connection_state: 'disconnected' });
      }
    };
  }, [sessionId]);

  return {
    session,
    createSession: createSession.mutate,
    updateSession: updateSession.mutate
  };
};