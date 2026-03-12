import React, { useRef } from 'react';
import { Upload, FolderPlus, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface FileUploadButtonProps {
  onUploadFiles: (files: File[]) => void;
  onUploadFolder: (files: File[]) => void;
  onCreateFolder: () => void;
  uploading?: boolean;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onUploadFiles,
  onUploadFolder,
  onCreateFolder,
  uploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFiles(Array.from(files));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFolder(Array.from(files));
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is a non-standard attribute
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={2.5} />
                New
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 bg-[#212121] border-white/10">
          <DropdownMenuItem
            onClick={onCreateFolder}
            className="flex items-center gap-3 py-3 cursor-pointer text-white/80 hover:text-white focus:bg-white/10"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FolderPlus size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-medium">New Folder</div>
              <div className="text-xs text-white/40">Create an empty folder</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 py-3 cursor-pointer text-white/80 hover:text-white focus:bg-white/10"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Upload size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-medium">Upload Files</div>
              <div className="text-xs text-white/40">Select files from your device</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-3 py-3 cursor-pointer text-white/80 hover:text-white focus:bg-white/10"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FolderPlus size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-medium">Upload Folder</div>
              <div className="text-xs text-white/40">Select a folder to upload</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
