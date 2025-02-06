import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ChatAreaProps {
  messages: any[] | undefined;
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  selectedUser: string | null;
  isLoading: boolean;
}

export const ChatArea = ({
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
  selectedUser,
  isLoading
}: ChatAreaProps) => {
  if (!selectedUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <MessageCircle className="h-12 w-12 mb-2" />
        <p>Select a user to start messaging</p>
      </motion.div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  message.sender_id === selectedUser ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === selectedUser
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={(e) => { e.preventDefault(); onSendMessage(); }} className="p-4 border-t bg-card">
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button type="submit" disabled={!messageText.trim()}>
            <Send className="h-4 w-4" />
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </form>
    </>
  );
};