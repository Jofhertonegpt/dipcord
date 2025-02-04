import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUser: any;
}

export const CommentSection = ({ postId, comments, currentUser }: CommentSectionProps) => {
  const [newComment, setNewComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error("Must be logged in to comment");

      const { error: insertError } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
      console.error("Comment error:", error);
    },
  });

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await createCommentMutation.mutateAsync(newComment);
  };

  return (
    <div className="mt-2 space-y-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {currentUser?.email?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Write a comment..."
            className="min-h-[40px] bg-white/5 border-white/10 resize-none"
            rows={isExpanded ? 3 : 1}
          />
          {isExpanded && (
            <div className="flex justify-end mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(false);
                  setNewComment("");
                }}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim()}
              >
                Comment
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2 group">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.user.avatar_url ?? undefined} />
              <AvatarFallback>
                {comment.user.username?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {comment.user.username}
                  </span>
                  <span className="text-xs text-white/40">
                    {format(new Date(comment.created_at), "MMM d")}
                  </span>
                </div>
                <p className="text-sm text-white/80">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};