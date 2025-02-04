import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Hash, Volume2, Send, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

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

const ServerView = () => {
  const { serverId } = useParams();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

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
      return data as Channel[];
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
      return data as Message[];
    },
    enabled: !!selectedChannel
  });

  // Create new channel mutation
  const createChannel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('channels')
        .insert([
          {
            server_id: serverId,
            name: newChannelName,
            type: newChannelType,
          },
        ]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      setIsCreatingChannel(false);
      setNewChannelName("");
      toast.success("Channel created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create channel");
      console.error(error);
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (files?: FileList) => {
      if (!selectedChannel || (!messageText && !files)) return;

      let mediaUrls: string[] = [];

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('messages')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('messages')
            .getPublicUrl(fileName);

          mediaUrls.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            channel_id: selectedChannel,
            content: messageText,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          },
        ]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChannel] });
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      sendMessage.mutate(files);
    }
  };

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
  }, [selectedChannel, queryClient]);

  if (!server || !channels) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Channels sidebar */}
      <div className="w-64 bg-muted p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{server.name}</h2>
          <Dialog open={isCreatingChannel} onOpenChange={setIsCreatingChannel}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button
                    variant={newChannelType === 'text' ? 'default' : 'outline'}
                    onClick={() => setNewChannelType('text')}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    Text
                  </Button>
                  <Button
                    variant={newChannelType === 'voice' ? 'default' : 'outline'}
                    onClick={() => setNewChannelType('voice')}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Voice
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createChannel.mutate()}
                  disabled={!newChannelName.trim()}
                >
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Text Channels</h3>
              {channels
                .filter((channel) => channel.type === 'text')
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full p-2 flex items-center space-x-2 rounded-lg hover:bg-accent ${
                      selectedChannel === channel.id ? 'bg-accent' : ''
                    }`}
                  >
                    <Hash className="h-4 w-4" />
                    <span>{channel.name}</span>
                  </button>
                ))}
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2">Voice Channels</h3>
              {channels
                .filter((channel) => channel.type === 'voice')
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full p-2 flex items-center space-x-2 rounded-lg hover:bg-accent ${
                      selectedChannel === channel.id ? 'bg-accent' : ''
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>{channel.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages?.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {/* Add avatar component here */}
                    </div>
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold">{message.sender.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p>{message.content}</p>
                      {message.media_urls && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {message.media_urls.map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt="Uploaded content"
                              className="rounded-lg max-w-sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage.mutate();
                    }
                  }}
                />
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button onClick={() => sendMessage.mutate()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
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