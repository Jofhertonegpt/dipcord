import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChannelList } from "@/components/server/ChannelList";
import { MessageList } from "@/components/server/MessageList";
import { MessageInput } from "@/components/server/MessageInput";
import { Loader2, PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  created_at: string;
  updated_at: string;
  server_id: string;
  description: string | null;
}

const ServerView = () => {
  const { serverId } = useParams();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // Fetch channels with type casting
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
      
      // Ensure the type is either 'text' or 'voice'
      return data?.map(channel => ({
        ...channel,
        type: channel.type === 'voice' ? 'voice' : 'text'
      } as Channel)) || [];
    },
    enabled: !!serverId
  });

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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div 
        className={`transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } h-full relative`}
      >
        {sidebarOpen && (
          <ChannelList
            serverId={serverId!}
            channels={channels}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-10 top-4"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <PanelLeftIcon /> : <PanelRightIcon />}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {selectedChannel ? (
          <>
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-hidden">
                  <MessageList messages={messages} channelId={selectedChannel} />
                </div>
                <div className="p-4 border-t border-border">
                  <MessageInput channelId={selectedChannel} />
                </div>
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
