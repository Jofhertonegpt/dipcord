import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TurnServer } from '@/types/database';

export const useTurnServers = () => {
  return useQuery({
    queryKey: ['turn-servers'],
    queryFn: async () => {
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      const { data, error } = await supabase
        .from('turn_servers')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Error fetching TURN servers:', error);
        return defaultServers;
      }

      if (!data?.length) {
        return defaultServers;
      }

      return [
        ...defaultServers,
        ...data.map((server: TurnServer) => ({
          urls: server.url,
          username: server.username || undefined,
          credential: server.credential || undefined
        }))
      ];
    }
  });
};