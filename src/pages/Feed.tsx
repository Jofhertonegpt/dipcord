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
import { Heart, MessageSquare, Share2, ImagePlus } from "lucide-react";
import { CommentSection } from "@/components/post/CommentSection";
import { useFileUpload } from "@/components/message/useFileUpload";
import { FilePreview } from "@/components/message/FilePreview";
import { MediaEmbed } from "@/components/post/MediaEmbed";

const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const {
    selectedFiles,
    fileInputRef,
    handleFileSelect,
    removeFile,
    uploadFiles,
    setSelectedFiles
  } = useFileUpload();

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

  // Extract URLs from content
  const extractUrls = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  };

  // Fetch posts with embedded media
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

  // Create post mutation with embedded media detection
  const createPostMutation = useMutation({
    mutationFn: async ({ content, mediaUrls }: { content: string; mediaUrls: string[] }) => {
      const urls = extractUrls(content);
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
      setNewPost("");
      setSelectedFiles([]);
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

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && selectedFiles.length === 0) return;

    try {
      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        mediaUrls = await uploadFiles(selectedFiles);
      }

      await createPostMutation.mutateAsync({ content: newPost, mediaUrls });
    } catch (error) {
      toast.error("Failed to upload media");
      console.error("Upload error:", error);
    }
  };

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
            <div className="flex-1 space-y-2">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="min-h-[100px] bg-background"
              />
              <FilePreview files={selectedFiles} onRemove={removeFile} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            <Button
              type="submit"
              disabled={(!newPost.trim() && selectedFiles.length === 0) || createPostMutation.isPending}
            >
              Post
            </Button>
          </div>
        </form>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts?.map((post: any) => (
          <Card key={post.id} className="p-4 bg-card animate-fade-in">
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
                <p className="mt-2 text-foreground whitespace-pre-wrap">{post.content}</p>
                
                {/* Media Display */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {post.media_urls.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Post media ${index + 1}`}
                        className="rounded-lg w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {/* Embedded Media */}
                {post.embedded_media && post.embedded_media.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {post.embedded_media.map((embed: any, index: number) => (
                      <MediaEmbed key={index} url={embed.url} />
                    ))}
                  </div>
                )}
                
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