import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";

interface Server {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
}

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
    <Card className="w-full max-w-5xl mx-auto glass-morphism">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-foreground">Your Servers</h2>
        <Button variant="ghost" size="icon">
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : servers?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              You haven't joined any servers yet
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
              <div className="group relative bg-white/50 hover:bg-white/60 transition-all duration-200 rounded-lg shadow-sm">
                <div className="p-6">
                  <NotificationPopover />
                  <h3 className="text-xl font-semibold mb-2 text-foreground mt-4">Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Check your latest notifications and updates
                  </p>
                </div>
              </div>
              {servers?.map((server) => (
                <button
                  key={server.id}
                  onClick={() => handleServerClick(server.id)}
                  className="group relative flex flex-col p-6 rounded-lg glass-morphism hover:bg-white/10 transition-all duration-200"
                >
                  <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {server.name}
                  </h3>
                  {server.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {server.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};