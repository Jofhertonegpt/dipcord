import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProfileView } from "@/components/profile/ProfileView";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  media_urls: string[] | null;
}

interface MessageListProps {
  messages?: Message[];
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, username, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isPdf = (url: string) => {
    return url.toLowerCase().endsWith('.pdf');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="h-[calc(100vh-8rem)] px-4">
      <div className="space-y-4 py-4">
        {messages?.map((message) => (
          <div key={message.id} className="flex items-start space-x-4 group hover:bg-white/5 p-2 rounded-lg transition-colors">
            <Dialog>
              <DialogTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={message.sender?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {message.sender?.username?.substring(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>User Profile</DialogTitle>
                {message.sender && <ProfileView userId={message.sender.id} />}
              </DialogContent>
            </Dialog>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white">
                  {message.sender?.username ?? "Unknown User"}
                </span>
                <span className="text-xs text-white/40">
                  {format(new Date(message.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-white/80">{message.content}</p>
              {message.media_urls && message.media_urls.length > 0 && (
                <div className="grid gap-2 mt-2 grid-cols-1">
                  {message.media_urls.map((url, index) => (
                    isPdf(url) ? (
                      <Dialog key={index} open={selectedPdf === url} onOpenChange={(open) => setSelectedPdf(open ? url : null)}>
                        <DialogTrigger asChild>
                          <div className="flex items-center space-x-2 p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors">
                            <FileText className="h-6 w-6" />
                            <span>View PDF</span>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[80vh]">
                          <DialogTitle>PDF Viewer</DialogTitle>
                          <div className="flex-1 overflow-auto">
                            <Document
                              file={url}
                              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                              className="pdf-document"
                            >
                              {Array.from(new Array(numPages || 0), (_, index) => (
                                <Page
                                  key={`page_${index + 1}`}
                                  pageNumber={index + 1}
                                  className="mb-4"
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              ))}
                            </Document>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <img
                        key={index}
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="rounded-md max-w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};