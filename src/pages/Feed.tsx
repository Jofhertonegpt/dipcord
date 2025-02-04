import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Heart, MessageSquare, LogOut, ImagePlus, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  media_urls: string[] | null;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  user_liked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get likes status for each post
      const postsWithLikes = await Promise.all(data.map(async (post) => {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle();

        return {
          ...post,
          user_liked: !!likeData
        };
      }));

      return postsWithLikes as Post[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) return [];
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('post_id', selectedPostId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!selectedPostId
  });

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        mediaUrls = await uploadFiles(selectedFiles);
      }

      const { error } = await supabase
        .from('posts')
        .insert([
          { 
            content, 
            user_id: user.id,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewPost("");
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success("Post created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Error creating post: ${error.message}`);
    }
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const post = posts?.find(p => p.id === postId);
      if (!post) throw new Error("Post not found");

      if (post.user_liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([
            { post_id: postId, user_id: user.id }
          ]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      toast.error(`Error toggling like: ${error.message}`);
    }
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('comments')
        .insert([
          { 
            post_id: postId,
            user_id: user.id,
            content
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['comments', selectedPostId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success("Comment added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Error adding comment: ${error.message}`);
    }
  });

  const handleCreatePost = async () => {
    if (!newPost.trim() && selectedFiles.length === 0) return;
    await createPost.mutate(newPost);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <Button variant="ghost" onClick={handleSignOut} className="hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Card className="mb-8 glass-morphism">
          <CardContent className="pt-6">
            <Textarea
              className="w-full min-h-[100px] p-4 rounded-lg bg-white/5 border-white/10 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-white/50"
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            {selectedFiles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative inline-block">
                    <div className="px-3 py-1 rounded bg-white/10 text-white flex items-center gap-2">
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-white/60 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
            <Button 
              onClick={handleCreatePost} 
              disabled={(!newPost.trim() && selectedFiles.length === 0) || createPost.isPending}
              className="hover-scale"
            >
              {createPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Post
            </Button>
          </CardFooter>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="space-y-4">
            {posts?.map((post) => (
              <Card key={post.id} className="glass-morphism hover-scale">
                <CardHeader className="flex flex-row items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={post.profiles.avatar_url || ''} />
                    <AvatarFallback>
                      {post.profiles.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">
                      {post.profiles.full_name || post.profiles.username}
                    </p>
                    <p className="text-sm text-white/60">@{post.profiles.username}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-white">{post.content}</p>
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {post.media_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Post image ${index + 1}`}
                          className="rounded-lg w-full h-auto object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {selectedPostId === post.id && comments && (
                    <div className="mt-4 space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.profiles.avatar_url || ''} />
                            <AvatarFallback>
                              {comment.profiles.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm text-white/60">@{comment.profiles.username}</p>
                            <p className="text-white">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 min-h-[40px] p-2 text-sm bg-white/5"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newComment.trim()) {
                              addComment.mutate({ postId: post.id, content: newComment });
                            }
                          }}
                          disabled={!newComment.trim() || addComment.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white/60 hover:text-white hover:bg-white/10 ${
                      post.user_liked ? 'text-red-500 hover:text-red-600' : ''
                    }`}
                    onClick={() => toggleLike.mutate(post.id)}
                  >
                    <Heart
                      className={`h-4 w-4 mr-2 ${post.user_liked ? 'fill-current' : ''}`}
                    />
                    {post.likes_count}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {post.comments_count}
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

export default Feed;