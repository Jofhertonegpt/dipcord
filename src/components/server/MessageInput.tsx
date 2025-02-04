import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageInputProps {
  channelId: string;
}

export const MessageInput = ({ channelId }: MessageInputProps) => {
  const [messageText, setMessageText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (files?: FileList) => {
      if (!channelId || (!messageText && !files)) return;

      let mediaUrls: string[] = [];

      if (files?.length) {
        setIsUploading(true);
        try {
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
        } finally {
          setIsUploading(false);
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            channel_id: channelId,
            content: messageText,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          },
        ]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      toast.success("Message sent successfully");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      sendMessage.mutate(files);
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center space-x-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sendMessage.isPending || isUploading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage.mutate(undefined);
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
          disabled={sendMessage.isPending || isUploading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={sendMessage.isPending || isUploading}
          className="shrink-0"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => sendMessage.mutate(undefined)}
          disabled={(!messageText.trim() && !isUploading) || sendMessage.isPending}
          className="shrink-0"
        >
          {sendMessage.isPending || isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};