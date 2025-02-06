import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, HeadphoneOff } from "lucide-react";
import { UserContextMenu } from "./UserContextMenu";

interface VoiceParticipantListProps {
  channelId: string;
}

export const VoiceParticipantList = ({ channelId }: VoiceParticipantListProps) => {
  const queryClient = useQueryClient();

  /**
   * Fetches current voice channel participants
   * Includes user profile information and connection states
   * 
   * @query
   */
  const { data: participants } = useQuery({
    queryKey: ['voice-participants', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_channel_participants')
        .select(`
          *,
          user:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .neq('connection_state', 'disconnected');

      if (error) throw error;
      return data;
    },
  });

  /**
   * Sets up real-time subscription for participant updates
   * Handles joins, leaves, and state changes
   */
  useEffect(() => {
    const channel = supabase
      .channel('voice_participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_channel_participants',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          // Refetch participants when there are any changes
          queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  if (!participants?.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No one is in this channel
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {participants.map((participant) => (
        <UserContextMenu
          key={participant.user.id}
          userId={participant.user.id}
          username={participant.user.username}
          isMuted={participant.is_muted}
          isDeafened={participant.is_deafened}
        >
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-context-menu">
            <Avatar className="h-8 w-8">
              <AvatarImage src={participant.user.avatar_url || ''} />
              <AvatarFallback>
                {participant.user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-medium">
              {participant.user.username}
            </span>
            <div className="flex items-center gap-2">
              {participant.is_muted && (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              )}
              {!participant.is_muted && (
                <Mic className="h-4 w-4 text-green-500" />
              )}
              {participant.is_deafened && (
                <HeadphoneOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </UserContextMenu>
      ))}
    </div>
  );
};
