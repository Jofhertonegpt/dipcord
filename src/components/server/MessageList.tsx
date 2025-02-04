import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";

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

interface MessageListProps {
  messages: Message[] | undefined;
}

export const MessageList = ({ messages }: MessageListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Avatar>
                <img src={message.sender.avatar_url} alt={message.sender.username} />
              </Avatar>
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
  );
};