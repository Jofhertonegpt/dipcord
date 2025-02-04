import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProfileView } from "@/components/profile/ProfileView";
import { CommentSection } from "@/components/post/CommentSection";

type Post = Tables<"posts"> & {
  profiles: Tables<"profiles">;
  likes: Tables<"likes">[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  }[];
};

export default function Feed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            id,
            content,
            created_at,
            user:profiles(id, username, avatar_url)
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

  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageFile }: { content: string; imageFile: File | null }) => {
      if (!currentUser) throw new Error("Must be logged in to create posts");

      let mediaUrl: string | undefined;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('posts')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);
          
        mediaUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          content,
          user_id: currentUser.id,
          media_urls: mediaUrl ? [mediaUrl] : null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setNewPostContent("");
      setSelectedImage(null);
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
      console.error("Post creation error:", error);
    },
  });

  const handleCreatePost = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create posts",
        variant: "destructive",
      });
      return;
    }

    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createPostMutation.mutateAsync({
        content: newPostContent,
        imageFile: selectedImage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-morphism p-6 rounded-lg">
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Create Post Form */}
      <div className="glass-morphism p-6 rounded-lg">
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 rounded-lg bg-white/5 border-white/10 border focus:border-white/20 focus:ring-0 text-white placeholder:text-white/50 transition-colors resize-none"
        />
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("image-input")?.click()}
            className="hover:bg-white/10"
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
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || isSubmitting}
            className="hover:bg-white/10"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
        {selectedImage && (
          <div className="mt-4">
            <p className="text-sm text-white/70">Selected image: {selectedImage.name}</p>
          </div>
        )}
      </div>

      {/* Posts List */}
      {posts?.map((post) => (
        <div key={post.id} className="glass-morphism p-6 rounded-lg transition-all hover:bg-white/10">
          {/* Post Header */}
          <div className="flex items-center mb-4">
            <Avatar 
              className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-white/10"
              onClick={() => setSelectedProfile(post.profiles.id)}
            >
              <AvatarImage src={post.profiles.avatar_url || ""} />
              <AvatarFallback>{post.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div 
              className="ml-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedProfile(post.profiles.id)}
            >
              <p className="font-medium text-white">{post.profiles.username}</p>
            </div>
          </div>

          {/* Post Content */}
          <p className="mb-4 text-white/90">{post.content}</p>

          {/* Post Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img
                src={post.media_urls[0]}
                alt="Post media"
                className="w-full object-cover max-h-96 hover:scale-[1.02] transition-transform"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(post.id)}
              className={`gap-2 hover:bg-white/10 ${
                post.likes.some(like => like.user_id === currentUser?.id)
                  ? "text-red-500"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Heart className="h-4 w-4" />
              {post.likes.length}
            </Button>
          </div>

          {/* Comments Section */}
          <CommentSection
            postId={post.id}
            comments={post.comments}
            currentUser={currentUser}
          />
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
