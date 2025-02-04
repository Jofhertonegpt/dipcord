import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Hash, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  created_at: string;
  updated_at: string;
  server_id: string;
  description: string | null;
}

interface ChannelListProps {
  serverId: string;
  channels: Channel[] | undefined;
  selectedChannel: string | null;
  onSelectChannel: (channelId: string) => void;
}

export const ChannelList = ({ serverId, channels, selectedChannel, onSelectChannel }: ChannelListProps) => {
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const queryClient = useQueryClient();

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

  return (
    <div className="w-64 h-full bg-muted glass-morphism">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold">Channels</h2>
        <Dialog open={isCreatingChannel} onOpenChange={setIsCreatingChannel}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent">
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
                  className="flex-1"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant={newChannelType === 'voice' ? 'default' : 'outline'}
                  onClick={() => setNewChannelType('voice')}
                  className="flex-1"
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
      <ScrollArea className="h-[calc(100vh-5rem)] px-2">
        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 px-2">Text Channels</h3>
            {channels
              ?.filter((channel) => channel.type === 'text')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full p-2 flex items-center space-x-2 rounded-lg transition-colors ${
                    selectedChannel === channel.id 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2 px-2">Voice Channels</h3>
            {channels
              ?.filter((channel) => channel.type === 'voice')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full p-2 flex items-center space-x-2 rounded-lg transition-colors ${
                    selectedChannel === channel.id 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Volume2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};