import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const NotificationSettings = () => {
  const [newPosts, setNewPosts] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [directMessages, setDirectMessages] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast.success("Notification preferences saved!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>New Posts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when people you follow post
            </p>
          </div>
          <Switch
            checked={newPosts}
            onCheckedChange={setNewPosts}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Mentions</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone mentions you
            </p>
          </div>
          <Switch
            checked={mentions}
            onCheckedChange={setMentions}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Direct Messages</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about new messages
            </p>
          </div>
          <Switch
            checked={directMessages}
            onCheckedChange={setDirectMessages}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>New Followers</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone follows you
            </p>
          </div>
          <Switch
            checked={newFollowers}
            onCheckedChange={setNewFollowers}
          />
        </div>
        <Button onClick={handleSave} className="w-full">
          Save Notification Settings
        </Button>
      </CardContent>
    </Card>
  );
};