import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PrivacySettingsProps {
  profile: any;
}

export const PrivacySettings = ({ profile }: PrivacySettingsProps) => {
  const queryClient = useQueryClient();
  const [showOnlineStatus, setShowOnlineStatus] = useState(profile?.is_online ?? true);
  const [showLastSeen, setShowLastSeen] = useState(true);

  const updatePrivacyMutation = useMutation({
    mutationFn: async (settings: { is_online: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update(settings)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Privacy settings updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = async () => {
    await updatePrivacyMutation.mutateAsync({
      is_online: showOnlineStatus,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Online Status</Label>
            <p className="text-sm text-muted-foreground">
              Let others see when you're active
            </p>
          </div>
          <Switch
            checked={showOnlineStatus}
            onCheckedChange={setShowOnlineStatus}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Last Seen</Label>
            <p className="text-sm text-muted-foreground">
              Let others see when you were last active
            </p>
          </div>
          <Switch
            checked={showLastSeen}
            onCheckedChange={setShowLastSeen}
          />
        </div>
        <Button onClick={handleSave} className="w-full">
          Save Privacy Settings
        </Button>
      </CardContent>
    </Card>
  );
};