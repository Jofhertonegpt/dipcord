import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ProfileView } from "@/components/profile/ProfileView";
import { MediaPreview } from "./MediaPreview";
import { Badge } from "@/components/ui/badge";
import { Check, Lock } from "lucide-react";
import { useState } from "react";

interface MessageSender {
  id: string;
  username: string;
  avatar_url: string | null;
  is_online?: boolean;
}

interface MessageItemProps {
  id: string;
  content: string;
  created_at: string;
  sender: MessageSender | null;
  media_urls: string[] | null;
  isRead?: boolean;
  isDelivered?: boolean;
}

export const MessageItem = ({ 
  id, 
  content, 
  created_at, 
  sender, 
  media_urls,
  isRead = false,
  isDelivered = true
}: MessageItemProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileOpen(true);
  };

  return (
    <div className="flex items-start hover:bg-black/30 px-4 py-2 transition-colors group">
      <Dialog 
        open={isProfileOpen} 
        onOpenChange={(open) => {
          setIsProfileOpen(open);
        }}
      >
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="relative cursor-pointer">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={sender?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {sender?.username?.substring(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              {sender?.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="bg-[#403E43] border-[#33C3F0]/20 text-white">
            <ContextMenuItem 
              className="hover:bg-[#33C3F0]/10 focus:bg-[#33C3F0]/10 cursor-pointer"
              onClick={handleProfileClick}
            >
              View Profile
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <DialogContent>
          <DialogTitle>User Profile</DialogTitle>
          {sender && <ProfileView userId={sender.id} />}
        </DialogContent>
      </Dialog>

      <div className="flex-1 min-w-0 ml-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground hover:underline cursor-pointer">
            {sender?.username ?? "Unknown User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(created_at), "M/d/yyyy h:mm a")}
          </span>
          {sender?.is_online && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              online
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isDelivered && !isRead && <Check className="h-4 w-4 text-muted-foreground" />}
            {isRead && (
              <div className="flex -space-x-1">
                <Check className="h-4 w-4 text-primary" />
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <Lock className="h-3 w-3 text-muted-foreground ml-1" />
          </div>
        </div>
        <p className="text-foreground/80 break-words">{content}</p>
        {media_urls && media_urls.length > 0 && (
          <div className="grid gap-2 mt-2 grid-cols-1 max-w-2xl">
            {media_urls.map((url, index) => (
              <MediaPreview key={index} url={url} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};