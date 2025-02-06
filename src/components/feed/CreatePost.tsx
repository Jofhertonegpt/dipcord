import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus } from "lucide-react";
import { FilePreview } from "@/components/message/FilePreview";
import { useFileUpload } from "@/components/message/useFileUpload";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface CreatePostProps {
  currentUser: any;
  onSubmit: (content: string, mediaUrls: string[]) => Promise<void>;
  isSubmitting: boolean;
}

export const CreatePost = ({ currentUser, onSubmit, isSubmitting }: CreatePostProps) => {
  const [newPost, setNewPost] = useState("");
  const isMobile = useIsMobile();
  const {
    selectedFiles,
    fileInputRef,
    handleFileSelect,
    removeFile,
    uploadFiles,
    setSelectedFiles
  } = useFileUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && selectedFiles.length === 0) return;

    try {
      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        mediaUrls = await uploadFiles(selectedFiles);
      }

      await onSubmit(newPost, mediaUrls);
      setNewPost("");
      setSelectedFiles([]);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-card shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 shrink-0">
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
                className="min-h-[100px] bg-background resize-none"
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
              className="hover:bg-accent"
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
              disabled={(!newPost.trim() && selectedFiles.length === 0) || isSubmitting}
              className={isMobile ? "w-24" : ""}
            >
              Post
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};