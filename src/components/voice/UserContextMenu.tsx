import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  UserPlus,
  UserMinus,
  Ban,
  Volume2,
  MessageSquare,
  User,
  Mic,
  MicOff,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UserContextMenuProps {
  children: React.ReactNode;
  userId: string;
  username: string;
  isMuted?: boolean;
  isDeafened?: boolean;
}

export const UserContextMenu = ({
  children,
  userId,
  username,
  isMuted,
  isDeafened,
}: UserContextMenuProps) => {
  const [volume, setVolume] = useState(100);
  const queryClient = useQueryClient();

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, you would add a blocked_users table
      // and insert a record there
      toast.success(`Blocked ${username}`);
    },
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .update({ is_muted: !isMuted })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
      toast.success(`${isMuted ? 'Unmuted' : 'Muted'} ${username}`);
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('follows')
        .insert([
          { follower_id: user.id, following_id: userId }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Added ${username} as friend`);
    },
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </ContextMenuItem>
        <ContextMenuItem className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="gap-2"
          onClick={() => toggleMuteMutation.mutate()}
        >
          {isMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {isMuted ? "Unmute" : "Mute"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Volume2 className="h-4 w-4" />
            User Volume
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 p-2">
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={200}
              step={1}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="gap-2"
          onClick={() => addFriendMutation.mutate()}
        >
          <UserPlus className="h-4 w-4" />
          Add Friend
        </ContextMenuItem>
        <ContextMenuItem
          className="gap-2 text-red-500 focus:text-red-500"
          onClick={() => blockUserMutation.mutate()}
        >
          <Ban className="h-4 w-4" />
          Block
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};