import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ProfileView } from "@/components/profile/ProfileView";

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

interface MessageListProps {
  messages?: Message[];
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, username, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="h-[calc(100vh-8rem)] px-4">
      <div className="space-y-4 py-4">
        {messages?.map((message) => (
          <div key={message.id} className="flex items-start space-x-4 group hover:bg-white/5 p-2 rounded-lg transition-colors">
            <Dialog>
              <DialogTrigger>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={message.sender?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {message.sender?.username?.substring(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </DialogTrigger>
              <DialogContent>
                {message.sender && <ProfileView userId={message.sender.id} />}
              </DialogContent>
            </Dialog>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white">
                  {message.sender?.username ?? "Unknown User"}
                </span>
                <span className="text-xs text-white/40">
                  {format(new Date(message.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-white/80">{message.content}</p>
              {message.media_urls && message.media_urls.length > 0 && (
                <div className="grid gap-2 mt-2 grid-cols-1 sm:grid-cols-2">
                  {message.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="rounded-md max-w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
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