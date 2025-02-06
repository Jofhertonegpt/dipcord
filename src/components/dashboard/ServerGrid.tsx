import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Loader2, Bell, Users, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";

interface Server {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export const ServerGrid = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const { data: servers, isLoading } = useQuery({
    queryKey: ['user-servers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('server_members')
        .select(`
          server:servers (
            id,
            name,
            description,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(item => item.server) as Server[];
    },
  });

  const handleServerClick = (serverId: string) => {
    navigate(`/servers/${serverId}`);
  };

  return (
    <Card className="w-full max-w-5xl mx-auto bg-background/80 backdrop-blur-sm border-border shadow-lg">
      <motion.div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        transition={{ duration: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Servers
        </h2>
        <Button variant="ghost" size="icon" className="shrink-0">
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : servers?.length === 0 ? (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-8"
              >
                You haven't joined any servers yet
              </motion.p>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      variants={item}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative bg-card hover:bg-accent/10 transition-all duration-200 rounded-lg shadow-sm cursor-pointer p-6"
                    >
                      <Bell className="h-5 w-5 mb-4 text-foreground" />
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Check your latest notifications and updates
                      </p>
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <NotificationPopover />
                  </PopoverContent>
                </Popover>
                {servers?.map((server) => (
                  <motion.button
                    key={server.id}
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleServerClick(server.id)}
                    className="group relative flex flex-col p-6 rounded-lg bg-card hover:bg-accent/10 transition-all duration-200 text-left"
                  >
                    <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                      {server.name}
                    </h3>
                    {server.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {server.description}
                      </p>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </CardContent>
        )}
      </AnimatePresence>
    </Card>
  );
};