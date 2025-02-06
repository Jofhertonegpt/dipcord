/**
 * Custom hook for retrieving ICE (Interactive Connectivity Establishment) servers.
 * These servers are used for NAT traversal in WebRTC connections.
 * Combines default STUN servers with custom configured servers from the database.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIceServers = () => {
  /**
   * Fetches ICE server configuration from Supabase.
   * Falls back to default Google STUN servers if custom servers aren't available.
   * 
   * @returns Array of RTCIceServer configurations
   */
  const fetchIceServers = async () => {
    try {
      console.log('Fetching ICE servers...');
      // Default STUN servers as fallback
      const defaultServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      // Fetch custom ICE servers from database
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

      // Map custom servers to RTCIceServer format
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