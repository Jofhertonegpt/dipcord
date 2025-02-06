import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2 } from "lucide-react";
import { CommentSection } from "@/components/post/CommentSection";
import { MediaEmbed } from "@/components/post/MediaEmbed";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface PostCardProps {
  post: any;
  currentUser: any;
  onLike: () => void;
  onUnlike: () => void;
  onShare: () => void;
}

export const PostCard = ({ post, currentUser, onLike, onUnlike, onShare }: PostCardProps) => {
  const hasLiked = post.likes?.some((like: any) => like.user_id === currentUser?.id);
  const isMobile = useIsMobile();

  // Extract URLs from content
  const urls = post.content.match(/(https?:\/\/[^\s]+)/g) || [];
  const embeddedMedia = urls.map(url => ({
    url,
    type: url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
          url.includes('medal.tv') ? 'medal' : 'link'
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className="p-4 bg-card shadow-lg">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={post.user?.avatar_url} />
            <AvatarFallback>
              {post.user?.username?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{post.user?.username}</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(post.created_at), "MMM d, yyyy")}
              </span>
            </div>
            <p className="mt-2 text-foreground whitespace-pre-wrap break-words">{post.content}</p>
            
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
                {post.media_urls.map((url: string, index: number) => (
                  <motion.img
                    key={index}
                    src={url}
                    alt={`Post media ${index + 1}`}
                    className="rounded-lg w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(url, '_blank')}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>
            )}

            {embeddedMedia.length > 0 && (
              <div className="mt-4 space-y-4">
                {embeddedMedia.map((embed: any, index: number) => (
                  <MediaEmbed key={index} url={embed.url} />
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-1"
                onClick={() => hasLiked ? onUnlike() : onLike()}
              >
                <Heart
                  className={`h-4 w-4 ${
                    hasLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span>{post.likes?.length || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{post.comments?.length || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-1"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <CommentSection
              postId={post.id}
              comments={post.comments || []}
              currentUser={currentUser}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};