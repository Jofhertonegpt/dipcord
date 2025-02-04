import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-2 border-white/20">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2">
              {servers?.map((server) => (
                <button
                  key={server.id}
                  onClick={() => handleServerClick(server.id)}
                  className="flex flex-col items-center p-4 rounded-lg transition-all hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage src={server.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {server.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center line-clamp-2">
                    {server.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};