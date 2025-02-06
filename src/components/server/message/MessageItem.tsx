import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ProfileView } from "@/components/profile/ProfileView";
import { MediaPreview } from "./MediaPreview";
import { Badge } from "@/components/ui/badge";

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
}

export const MessageItem = ({ id, content, created_at, sender, media_urls }: MessageItemProps) => {
  return (
    <div className="flex items-start hover:bg-black/30 px-4 py-2 transition-colors">
      <ContextMenu>
        <ContextMenuTrigger>
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative">
                <Avatar className="cursor-pointer w-10 h-10 shrink-0">
                  <AvatarImage src={sender?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {sender?.username?.substring(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {sender?.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>User Profile</DialogTitle>
              {sender && <ProfileView userId={sender.id} />}
            </DialogContent>
          </Dialog>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <DialogTrigger asChild>
            <ContextMenuItem>View Profile</ContextMenuItem>
          </DialogTrigger>
        </ContextMenuContent>
      </ContextMenu>
      <div className="flex-1 min-w-0 ml-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground hover:underline cursor-pointer">
            {sender?.username ?? "Unknown User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(created_at), "MMM d, h:mm a")}
          </span>
          {sender?.is_online && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              online
            </Badge>
          )}
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