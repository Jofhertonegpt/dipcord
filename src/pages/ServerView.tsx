import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChannelList } from "@/components/server/ChannelList";
import { MessageList } from "@/components/server/MessageList";
import { MessageInput } from "@/components/server/MessageInput";

const ServerView = () => {
  const { serverId } = useParams();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Fetch server details
  const { data: server } = useQuery({
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
  const { data: channels } = useQuery({
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
  const { data: messages } = useQuery({
    queryKey: ['messages', selectedChannel],
    queryFn: async () => {
      if (!selectedChannel) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(username, avatar_url)')
        .eq('channel_id', selectedChannel)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChannel
  });

  // Set up realtime subscriptions
  useEffect(() => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', selectedChannel] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannel]);

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
            <MessageList messages={messages} />
            <MessageInput channelId={selectedChannel} />
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