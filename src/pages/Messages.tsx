import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserList } from "@/components/messages/UserList";
import { ChatArea } from "@/components/messages/ChatArea";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

const Messages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);

      if (error) throw error;
      return data;
    }
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user?.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("direct_messages")
        .insert([
          {
            sender_id: user?.id,
            receiver_id: selectedUser,
            content: messageText
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
      if (isMobile) {
        setSidebarOpen(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedUser) return;
    sendMessage.mutate();
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.div
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full md:w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold">Messages</h2>
              <UserList
                users={users}
                selectedUser={selectedUser}
                onSelectUser={handleSelectUser}
                isLoading={loadingUsers}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative">
        {isMobile && !sidebarOpen && (
          <Button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-2 left-2 z-20"
            size="icon"
            variant="outline"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
          onClick={() => isMobile && sidebarOpen && setSidebarOpen(false)}
        >
          <ChatArea
            messages={messages}
            messageText={messageText}
            onMessageChange={setMessageText}
            onSendMessage={handleSendMessage}
            selectedUser={selectedUser}
            isLoading={loadingMessages}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Messages;