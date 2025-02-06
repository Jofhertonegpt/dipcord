/**
 * Custom hook for retrieving ICE (Interactive Connectivity Establishment) servers.
 * These servers are used for NAT traversal in WebRTC connections.
 * This implementation uses only local STUN servers for direct peer-to-peer connections.
 */
import { useQuery } from "@tanstack/react-query";

export const useIceServers = () => {
  const fetchIceServers = async () => {
    console.log('Using local STUN servers only');
    // Use Google's public STUN server for NAT traversal
    // This doesn't route media through Google, it just helps with connection discovery
    return [
      { urls: 'stun:stun.l.google.com:19302' }
    ];
  };

  return useQuery({
    queryKey: ['ice-servers'],
    queryFn: fetchIceServers
  });
};