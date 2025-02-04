import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Users, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Server {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  avatar_url: string | null;
  owner_id: string | null;
  updated_at: string;
  is_private: boolean | null;
  member_count: number;
}

const Servers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newServerName, setNewServerName] = useState("");
  const [newServerDescription, setNewServerDescription] = useState("");

  const createServer = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            full_name: user.email
          }]);
        
        if (insertError) throw insertError;
      } else if (profileError) {
        throw profileError;
      }

      const { error } = await supabase
        .from('servers')
        .insert([
          { 
            name,
            description,
            owner_id: user.id 
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewServerName("");
      setNewServerDescription("");
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success("Server created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Error creating server: ${error.message}`);
    }
  });

  const joinServer = useMutation({
    mutationFn: async (serverId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('server_members')
        .insert([
          { 
            server_id: serverId,
            user_id: user.id 
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success("Joined server successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Error joining server: ${error.message}`);
    }
  });

  const handleJoinServer = async (serverId: string) => {
    await joinServer.mutate(serverId);
  };

  const handleCreateServer = async () => {
    if (!newServerName.trim() || !newServerDescription.trim()) return;
    await createServer.mutate({ 
      name: newServerName, 
      description: newServerDescription 
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select(`
          *,
          member_count:server_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our Server interface
      return (data || []).map(server => ({
        ...server,
        member_count: server.member_count?.[0]?.count || 0
      })) as Server[];
    },
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Servers</h1>
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="hover:bg-secondary"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="text-xl text-card-foreground">Create a New Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Server name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="bg-background/50"
            />
            <Input
              placeholder="Server description"
              value={newServerDescription}
              onChange={(e) => setNewServerDescription(e.target.value)}
              className="bg-background/50"
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateServer} 
              disabled={!newServerName.trim() || !newServerDescription.trim()}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Server
            </Button>
          </CardFooter>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {servers?.map((server) => (
              <Card key={server.id} className="card-gradient border-border flex flex-col fade-in">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={server.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {server.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-card-foreground">{server.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{server.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {server.member_count} members
                  </div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button 
                    className="w-full hover:bg-secondary" 
                    variant="outline"
                    onClick={() => handleJoinServer(server.id)}
                  >
                    Join Server
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Servers;