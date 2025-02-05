import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Headphones, HeadphoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VoiceControlsProps {
  channelId: string;
  onMuteChange: (isMuted: boolean) => void;
  onDeafenChange: (isDeafened: boolean) => void;
}

export const VoiceControls = ({
  channelId,
  onMuteChange,
  onDeafenChange,
}: VoiceControlsProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const queryClient = useQueryClient();

  const updateVoiceState = useMutation({
    mutationFn: async ({ isMuted, isDeafened }: { isMuted: boolean; isDeafened: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('voice_channel_participants')
        .update({ is_muted: isMuted, is_deafened: isDeafened })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update voice state: ${error.message}`);
    },
  });

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMuteChange(newMuted);
    updateVoiceState.mutate({ isMuted: newMuted, isDeafened });
  };

  const handleDeafenToggle = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    onDeafenChange(newDeafened);
    if (newDeafened) {
      setIsMuted(true);
      onMuteChange(true);
    }
    updateVoiceState.mutate({ isMuted: newDeafened ? true : isMuted, isDeafened: newDeafened });
  };

  return (
    <div className="flex items-center gap-2 p-4 border-t border-white/10">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMuteToggle}
        className={isMuted ? "text-red-500 hover:text-red-400" : "text-green-500 hover:text-green-400"}
      >
        {isMuted ? <MicOff /> : <Mic />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDeafenToggle}
        className={isDeafened ? "text-red-500 hover:text-red-400" : ""}
      >
        {isDeafened ? <HeadphoneOff /> : <Headphones />}
      </Button>
    </div>
  );
};