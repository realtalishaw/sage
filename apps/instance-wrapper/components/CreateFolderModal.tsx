import React, { useState } from 'react';
import { Loader2, FolderPlus } from 'lucide-react';
import { Button } from './Button';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isCreating: boolean;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isCreating,
}) => {
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (folderName.trim()) {
      onConfirm(folderName.trim());
      setFolderName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <FolderPlus size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Folder</h2>
              <p className="text-sm text-white/50">Create a new folder to organize your files</p>
            </div>
          </div>

          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full h-12 px-4 bg-[#252525] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Folder name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && folderName.trim()) {
                handleSubmit();
              }
            }}
          />

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isCreating || !folderName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
