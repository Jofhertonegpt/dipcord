import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProfileView } from "@/components/profile/ProfileView";
import { MediaPreview } from "./MediaPreview";

interface MessageSender {
  id: string;
  username: string;
  avatar_url: string | null;
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
    <div className="flex items-start gap-3 group hover:bg-white/5 px-3 py-2 rounded-lg transition-colors">
      <Dialog>
        <DialogTrigger asChild>
          <Avatar className="cursor-pointer w-9 h-9">
            <AvatarImage src={sender?.avatar_url ?? undefined} />
            <AvatarFallback>
              {sender?.username?.substring(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>User Profile</DialogTitle>
          {sender && <ProfileView userId={sender.id} />}
        </DialogContent>
      </Dialog>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-white hover:underline cursor-pointer">
            {sender?.username ?? "Unknown User"}
          </span>
          <span className="text-xs text-white/40">
            {format(new Date(created_at), "MMM d, h:mm a")}
          </span>
        </div>
        <p className="text-white/80 break-words">{content}</p>
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