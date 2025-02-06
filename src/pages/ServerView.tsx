import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChannelList } from "@/components/server/ChannelList";
import { MessageList } from "@/components/server/MessageList";
import { MessageInput } from "@/components/server/MessageInput";
import { VoiceChannel } from "@/components/voice/VoiceChannel";
import { Loader2, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  media_urls: string[] | null;
}

const ServerView = () => {
  const { serverId } = useParams();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const queryClient = useQueryClient();
  const isMobile = window.innerWidth <= 768;

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
        .select('*, sender:profiles(id, username, avatar_url)')
        .eq('channel_id', selectedChannel)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedChannel
  });

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

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleMessageAreaClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const selectedChannelType = channels?.find(c => c.id === selectedChannel)?.type;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed md:relative left-0 top-0 h-[calc(100vh-4rem)] z-30 w-72"
          >
            <ChannelList
              serverId={serverId!}
              channels={channels}
              selectedChannel={selectedChannel}
              onSelectChannel={handleChannelSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="flex-1 flex flex-col h-full relative"
        onClick={handleMessageAreaClick}
      >
        {!selectedChannel ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full text-muted-foreground"
          >
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-semibold">Welcome to {server?.name}</h3>
              <p>Select a channel to start chatting</p>
              {isMobile && !sidebarOpen && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(true);
                  }}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Menu className="h-4 w-4" />
                  Open Channels
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col h-full relative"
              >
                {isMobile && !sidebarOpen && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSidebarOpen(true);
                    }}
                    className="absolute top-2 left-2 z-20"
                    size="icon"
                    variant="outline"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
                {selectedChannelType === 'voice' ? (
                  <VoiceChannel channelId={selectedChannel} />
                ) : (
                  <>
                    <div className="flex-1 overflow-hidden">
                      <MessageList messages={messages} channelId={selectedChannel} />
                    </div>
                    <div className="mt-auto">
                      <MessageInput channelId={selectedChannel} />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ServerView;