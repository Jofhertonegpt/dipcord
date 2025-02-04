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
  is_member?: boolean;
}

const Servers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all servers with member count
      const { data, error } = await supabase
        .from('servers')
        .select(`
          *,
          member_count:server_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user's memberships
      const { data: memberships } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const memberServerIds = new Set(memberships?.map(m => m.server_id) || []);
      
      return (data || []).map(server => ({
        ...server,
        member_count: server.member_count?.[0]?.count || 0,
        is_member: memberServerIds.has(server.id)
      })) as Server[];
    },
  });

  const createServer = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
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
        .insert([{ 
          name,
          description,
          owner_id: user.id 
        }]);

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

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', serverId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        throw new Error("You are already a member of this server");
      }

      const { error } = await supabase
        .from('server_members')
        .insert([{ 
          server_id: serverId,
          user_id: user.id 
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success("Joined server successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleCreateServer = async () => {
    if (!newServerName.trim() || !newServerDescription.trim()) return;
    await createServer.mutate({ 
      name: newServerName, 
      description: newServerDescription 
    });
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
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto max-w-3xl p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <Button variant="ghost" onClick={handleSignOut} className="hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Card className="mb-8 glass-morphism">
          <CardHeader>
            <CardTitle className="text-white">Create a New Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Server name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
            <Input
              placeholder="Server description"
              value={newServerDescription}
              onChange={(e) => setNewServerDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateServer} 
              disabled={!newServerName.trim() || !newServerDescription.trim() || createServer.isPending}
              className="hover-scale w-full"
            >
              {createServer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Server
            </Button>
          </CardFooter>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {servers?.map((server) => (
              <Card key={server.id} className="glass-morphism hover-scale">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={server.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-white/10 text-white">
                        {server.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-white">{server.name}</CardTitle>
                      <p className="text-sm text-white/60">{server.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-white/60">
                    <Users className="h-4 w-4 mr-1" />
                    {server.member_count} members
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full hover:bg-white/10" 
                    variant="outline"
                    onClick={() => joinServer.mutate(server.id)}
                    disabled={joinServer.isPending || server.is_member}
                  >
                    {joinServer.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : server.is_member ? (
                      "Already Joined"
                    ) : (
                      "Join Server"
                    )}
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