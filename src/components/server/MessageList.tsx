import { useEffect } from "react";
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
  };
}

interface MessageListProps {
  messages: Message[] | undefined;
  channelId: string;
}

export const MessageList = ({ messages, channelId }: MessageListProps) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for new messages
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
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender.avatar_url} alt={message.sender.username} />
              <AvatarFallback>{message.sender.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold">{message.sender.username}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
              {message.media_urls && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {message.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt="Uploaded content"
                      className="rounded-lg max-w-sm object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};