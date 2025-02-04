import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileViewProps {
  userId: string;
  onClose?: () => void;
}

export const ProfileView = ({ userId, onClose }: ProfileViewProps) => {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          _count: follows!follows_following_id_fkey(count),
          following: follows!follows_follower_id_fkey(count)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return profile;
    },
  });

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
      return !!data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([
            { follower_id: user.id, following_id: userId }
          ]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      toast.success(isFollowing ? "Unfollowed successfully" : "Followed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Profile not found
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-morphism">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback>
              {profile.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          {profile.full_name || profile.username}
        </CardTitle>
        {profile.full_name && (
          <p className="text-sm text-white/60">@{profile.username}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.bio && (
          <p className="text-white/80 text-center">{profile.bio}</p>
        )}
        <div className="flex justify-center gap-8 text-center">
          <div>
            <p className="text-lg font-semibold text-white">{profile._count}</p>
            <p className="text-sm text-white/60">Followers</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{profile.following}</p>
            <p className="text-sm text-white/60">Following</p>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            className="w-full max-w-[200px] hover:bg-white/10"
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
          >
            {followMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};