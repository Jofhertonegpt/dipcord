import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTurnServers = () => {
  return useQuery({
    queryKey: ['turn-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('turn_servers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Always include STUN servers
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      if (!data?.length) {
        return defaultServers;
      }

      return [
        ...defaultServers,
        ...data.map(server => ({
          urls: server.url,
          username: server.username,
          credential: server.credential
        }))
      ];
    }
  });
};