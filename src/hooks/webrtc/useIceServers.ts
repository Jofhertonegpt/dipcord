import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIceServers = () => {
  const fetchIceServers = async () => {
    try {
      console.log('Fetching ICE servers...');
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      const { data: customServers, error } = await supabase
        .from('ice_servers')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Error fetching ICE servers:', error);
        return defaultServers;
      }

      if (!customServers?.length) {
        console.log('Using default STUN servers');
        return defaultServers;
      }

      console.log('Using custom ICE servers:', customServers);
      return customServers.map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential
      }));
    } catch (error) {
      console.error('Error in fetchIceServers:', error);
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  };

  return useQuery({
    queryKey: ['ice-servers'],
    queryFn: fetchIceServers
  });
};