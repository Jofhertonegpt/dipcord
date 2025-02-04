import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, ImagePlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProfileView } from "@/components/profile/ProfileView";

type Post = Tables<"posts"> & {
  profiles: Tables<"profiles">;
  likes: Tables<"likes">[];
  comments: Tables<"comments">[];
};

export default function Feed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          ),
          likes (
            user_id
          ),
          comments (
            id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Post[];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      if (!currentUser) throw new Error("Must be logged in to like posts");

      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .single();

      if (existingLike) {
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("id", existingLike.id);
        
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("likes")
          .insert({
            post_id: postId,
            user_id: currentUser.id,
          });
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to toggle like. Please try again.",
        variant: "destructive",
      });
      console.error("Like error:", error);
    },
  });

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to like posts",
        variant: "destructive",
      });
      return;
    }
    toggleLikeMutation.mutate({ postId });
  };

  if (isLoading) {
    return <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Create Post Form */}
      <div className="bg-card p-4 rounded-lg shadow">
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-2 rounded border mb-2"
        />
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("image-input")?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Add Image
          </Button>
          <input
            id="image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
          />
          <Button
            onClick={() => {/* implement createPost */}}
            disabled={!newPostContent.trim()}
          >
            Post
          </Button>
        </div>
      </div>

      {/* Posts List */}
      {posts?.map((post) => (
        <div key={post.id} className="bg-card p-4 rounded-lg shadow">
          {/* Post Header */}
          <div className="flex items-center mb-4">
            <Avatar 
              className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedProfile(post.profiles.id)}
            >
              <AvatarImage src={post.profiles.avatar_url || ""} />
              <AvatarFallback>{post.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div 
              className="ml-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedProfile(post.profiles.id)}
            >
              <p className="font-medium">{post.profiles.username}</p>
            </div>
          </div>

          {/* Post Content */}
          <p className="mb-4">{post.content}</p>

          {/* Post Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mb-4">
              <img
                src={post.media_urls[0]}
                alt="Post media"
                className="rounded-lg max-h-96 w-full object-cover"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(post.id)}
              className={`gap-2 ${
                post.likes.some(like => like.user_id === currentUser?.id)
                  ? "text-red-500"
                  : ""
              }`}
            >
              <Heart className="h-4 w-4" />
              {post.likes.length}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {post.comments.length}
            </Button>
          </div>
        </div>
      ))}

      {/* Profile Sheet */}
      <Sheet open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          {selectedProfile && (
            <ProfileView 
              userId={selectedProfile} 
              onClose={() => setSelectedProfile(null)} 
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}