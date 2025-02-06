import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isMobile = useIsMobile();

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

  const createPostMutation = useMutation({
    mutationFn: async ({ content, mediaUrls }: { content: string; mediaUrls: string[] }) => {
      const urls = content.match(/(https?:\/\/[^\s]+)/g) || [];
      const embeddedMedia = urls.map(url => ({
        url,
        type: url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
              url.includes('medal.tv') ? 'medal' : 'link'
      }));

      const { error } = await supabase
        .from('posts')
        .insert([{ 
          content, 
          user_id: currentUser.id,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          embedded_media: embeddedMedia.length > 0 ? embeddedMedia : null
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success("Post created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create post");
      console.error("Post error:", error);
    },
  });

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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto p-4 max-w-2xl space-y-6">
        <CreatePost
          currentUser={currentUser}
          onSubmit={async (content, mediaUrls) => {
            await createPostMutation.mutateAsync({ content, mediaUrls });
          }}
          isSubmitting={createPostMutation.isPending}
        />

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {posts?.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onLike={() => likePostMutation.mutate(post.id)}
              onUnlike={() => unlikePostMutation.mutate(post.id)}
              onShare={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/posts/${post.id}`
                );
                toast.success("Link copied to clipboard!");
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Feed;
