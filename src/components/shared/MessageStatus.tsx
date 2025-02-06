import { Check } from "lucide-react";

interface MessageStatusProps {
  isDelivered?: boolean;
  isRead?: boolean;
}

export const MessageStatus = ({ isDelivered, isRead }: MessageStatusProps) => {
  if (!isDelivered) return null;
  
  return (
    <div className="flex items-center gap-1">
      {isDelivered && !isRead && <Check className="h-4 w-4 text-muted-foreground" />}
      {isRead && (
        <div className="flex -space-x-1">
          <Check className="h-4 w-4 text-primary" />
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
};