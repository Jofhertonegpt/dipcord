import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BackgroundSettings {
  color: string;
  animationSpeed: number;
  density: number;
}

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    color: "#ea384c",
    animationSpeed: 1,
    density: 250,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return null;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUsername(profile.username);
      }
      return profile;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ username, avatarUrl }: { username: string; avatarUrl?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const updates = {
        username,
        ...(avatarUrl && { avatar_url: avatarUrl }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('posts')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(data.path);
          avatarUrl = publicUrl;
        }
      }

      await updateProfileMutation.mutateAsync({ username, avatarUrl });
    } catch (error) {
      toast.error("Error updating profile");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackgroundUpdate = (settings: Partial<BackgroundSettings>) => {
    setBackgroundSettings(prev => ({ ...prev, ...settings }));
    // Dispatch an event to update the AnimatedBackground component
    window.dispatchEvent(new CustomEvent('updateBackground', { 
      detail: { ...backgroundSettings, ...settings }
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-8">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="max-w-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background">
          <Card>
            <CardHeader>
              <CardTitle>Background Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-4 items-center">
                  <Input
                    type="color"
                    value={backgroundSettings.color}
                    onChange={(e) => handleBackgroundUpdate({ color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-muted-foreground">
                    {backgroundSettings.color}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Animation Speed</Label>
                <Slider
                  value={[backgroundSettings.animationSpeed]}
                  onValueChange={([value]) => handleBackgroundUpdate({ animationSpeed: value })}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">
                  {backgroundSettings.animationSpeed}x
                </span>
              </div>

              <div className="space-y-2">
                <Label>Particle Density</Label>
                <Slider
                  value={[backgroundSettings.density]}
                  onValueChange={([value]) => handleBackgroundUpdate({ density: value })}
                  min={50}
                  max={500}
                  step={10}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">
                  {backgroundSettings.density} particles
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;