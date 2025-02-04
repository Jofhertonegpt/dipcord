import { FileText, Video, Music } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from "react";

interface MediaPreviewProps {
  url: string;
  index: number;
}

const isPdf = (url: string) => url.toLowerCase().endsWith('.pdf');
const isVideo = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};
const isAudio = (url: string) => {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  return audioExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export const MediaPreview = ({ url, index }: MediaPreviewProps) => {
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  if (isPdf(url)) {
    return (
      <Dialog open={selectedPdf === url} onOpenChange={(open) => setSelectedPdf(open ? url : null)}>
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
    );
  }

  if (isVideo(url)) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-black/20">
        <div className="flex items-center space-x-2 p-2 bg-white/5 rounded">
          <Video className="h-5 w-5" />
          <span className="text-sm">Video Player</span>
        </div>
        <video
          controls
          className="w-full max-h-[400px]"
          preload="metadata"
        >
          <source src={url} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isAudio(url)) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-white/5 rounded">
        <Music className="h-5 w-5" />
        <audio
          controls
          className="flex-1"
          preload="metadata"
        >
          <source src={url} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Attachment ${index + 1}`}
      className="rounded-md max-w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer"
      onClick={() => window.open(url, '_blank')}
    />
  );
};