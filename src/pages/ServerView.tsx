import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChannelList } from "@/components/server/ChannelList";
import { MessageList } from "@/components/server/MessageList";
import { MessageInput } from "@/components/server/MessageInput";
import { Loader2 } from "lucide-react";

const ServerView = () => {
  const { serverId } = useParams();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch server details
  const { data: server, isLoading: loadingServer } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('*, owner:profiles(username)')
        .eq('id', serverId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!serverId
  });

  // Fetch channels
  const { data: channels, isLoading: loadingChannels } = useQuery({
    queryKey: ['channels', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('type', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!serverId
  });

  // Fetch messages for selected channel
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedChannel],
    queryFn: async () => {
      if (!selectedChannel) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(username, avatar_url)')
        .eq('channel_id', selectedChannel)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChannel
  });

  // Set up realtime subscriptions for channels
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel('channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  if (loadingServer || loadingChannels) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ChannelList
        serverId={serverId!}
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
      />
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <MessageList messages={messages} channelId={selectedChannel} />
                <MessageInput channelId={selectedChannel} />
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerView;