import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
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
  const [newServerName, setNewServerName] = useState("");
  const [newServerDescription, setNewServerDescription] = useState("");

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

  const handleCreateServer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('servers')
        .insert([
          { 
            name: newServerName, 
            description: newServerDescription,
            owner_id: user.id 
          }
        ]);

      if (error) throw error;
      
      setNewServerName("");
      setNewServerDescription("");
      toast.success("Server created successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleJoinServer = async (serverId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('server_members')
        .insert([
          { 
            server_id: serverId,
            user_id: user.id 
          }
        ]);

      if (error) throw error;
      
      toast.success("Joined server successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Servers</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create a New Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Server name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
            />
            <Input
              placeholder="Server description"
              value={newServerDescription}
              onChange={(e) => setNewServerDescription(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateServer} 
              disabled={!newServerName.trim() || !newServerDescription.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Server
            </Button>
          </CardFooter>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {servers?.map((server) => (
              <Card key={server.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={server.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {server.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{server.name}</CardTitle>
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
                    className="w-full" 
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