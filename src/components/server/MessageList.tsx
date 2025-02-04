import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  media_urls: string[] | null;
  sender: {
    username: string;
    avatar_url: string;
  } | null;
}

interface MessageListProps {
  messages: Message[] | undefined;
  channelId: string;
}

export const MessageList = ({ messages, channelId }: MessageListProps) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="group flex items-start space-x-3 hover:bg-accent/5 p-2 rounded-lg">
            <Avatar className="h-8 w-8 shrink-0">
              {message.sender?.avatar_url ? (
                <AvatarImage src={message.sender.avatar_url} alt={message.sender?.username || 'User'} />
              ) : (
                <AvatarFallback>
                  {message.sender?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold">{message.sender?.username || 'Unknown User'}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm break-words">{message.content}</p>
              {message.media_urls && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {message.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt="Uploaded content"
                      className="rounded-lg max-w-sm object-cover hover:scale-105 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
