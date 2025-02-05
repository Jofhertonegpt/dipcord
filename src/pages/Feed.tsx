import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Heart, MessageSquare, Share2 } from "lucide-react";
import { CommentSection } from "@/components/post/CommentSection";

const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      } else {
        setCurrentUser(session.user);
      }
    };
    checkAuth();
  }, [navigate]);

  // Fetch posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles!posts_user_id_fkey (
            username,
            avatar_url
          ),
          comments:comments (
            id,
            content,
            created_at,
            user:profiles!comments_user_id_fkey (
              id,
              username,
              avatar_url
            )
          ),
          likes:likes (
            id,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('posts')
        .insert([{ content, user_id: currentUser.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewPost("");
      toast.success("Post created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create post");
      console.error("Post error:", error);
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('likes')
        .insert([{ post_id: postId, user_id: currentUser.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error("Failed to like post");
      console.error("Like error:", error);
    },
  });

  // Unlike post mutation
  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error("Failed to unlike post");
      console.error("Unlike error:", error);
    },
  });

  // Handle post submission
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    await createPostMutation.mutateAsync(newPost);
  };

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      {/* Create Post */}
      <Card className="p-4 bg-card">
        <form onSubmit={handleSubmitPost} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {currentUser?.email?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 min-h-[100px] bg-background"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newPost.trim() || createPostMutation.isPending}
            >
              Post
            </Button>
          </div>
        </form>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts?.map((post: any) => (
          <Card key={post.id} className="p-4 bg-card">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.user?.avatar_url} />
                <AvatarFallback>
                  {post.user?.username?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{post.user?.username}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(post.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <p className="mt-2 text-foreground">{post.content}</p>
                
                {/* Post Actions */}
                <div className="flex items-center gap-4 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      const hasLiked = post.likes?.some(
                        (like: any) => like.user_id === currentUser?.id
                      );
                      if (hasLiked) {
                        unlikePostMutation.mutate(post.id);
                      } else {
                        likePostMutation.mutate(post.id);
                      }
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        post.likes?.some(
                          (like: any) => like.user_id === currentUser?.id
                        )
                          ? "fill-red-500 text-red-500"
                          : ""
                      }`}
                    />
                    <span>{post.likes?.length || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.comments?.length || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/posts/${post.id}`
                      );
                      toast.success("Link copied to clipboard!");
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Comments Section */}
                <CommentSection
                  postId={post.id}
                  comments={post.comments || []}
                  currentUser={currentUser}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Feed;