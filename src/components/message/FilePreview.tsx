import { X } from "lucide-react";

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
}

export const FilePreview = ({ files, onRemove }: FilePreviewProps) => {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {files.map((file, index) => (
        <div key={index} className="relative inline-block">
          <div className="px-3 py-1 rounded bg-white/10 text-white flex items-center gap-2">
            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
            <button
              onClick={() => onRemove(index)}
              className="text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};