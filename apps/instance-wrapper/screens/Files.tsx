import React, { useEffect, useState, useMemo, useCallback, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronDown, List, Grid2x2, Loader2, Trash2, AlertTriangle, Check, Star, User, Upload } from 'lucide-react';
import { Icons } from '../constants';
import { Button } from '../components/Button';
import { FileActionsMenu } from '../components/FileActionsMenu';
import { FolderActionsMenu } from '../components/FolderActionsMenu';
import { FolderIllustration } from '../components/FolderIllustration';
import { FileUploadButton } from '../components/FileUploadButton';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { getFileTypeIcon } from '../utils/fileTypeIcon';
import { supabase } from '../src/integrations/supabase/client';
import { fetchUserArtifacts, toDisplayFile, toDisplayFolder } from '../services/artifacts';
import { useUserFiles } from '../hooks/useUserFiles';
import { toast } from 'sonner';
import { isToday, isWithinInterval, subDays, parseISO, format } from 'date-fns';

// Favorites localStorage key
const FAVORITES_STORAGE_KEY = 'files-favorites';
interface DisplayFile {
  id: string;
  name: string;
  rawSlug?: string;
  owner: string;
  lastModified: string;
  source: string;
  tags: string[];
  type: 'folder' | 'file' | 'doc' | 'sheet' | 'image' | 'pdf';
  size?: string;
  avatar?: string;
  url?: string;
  fileCount?: number;
  badges?: string[];
  outputText?: string | null;
  createdBy?: 'agent' | 'user';
  storagePath?: string | null;
  isFavorite?: boolean;
  parentFolderId?: string | null;
}


// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  fileName: string;
  isFolder?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}> = ({ isOpen, fileName, isFolder = false, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  const itemType = isFolder ? 'Folder' : 'File';
  const warningText = isFolder 
    ? 'This folder and all its contents will be removed from your library and cannot be recovered.'
    : 'This file will be removed from your library and cannot be recovered.';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delete {itemType}</h2>
              <p className="text-sm text-white/50">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-6">
            Are you sure you want to permanently delete <span className="font-semibold text-white">"{fileName}"</span>? 
            {warningText}
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete {itemType}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rename Modal
const RenameModal: React.FC<{
  isOpen: boolean;
  currentName: string;
  isFolder?: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  isRenaming: boolean;
}> = ({ isOpen, currentName, isFolder = false, onClose, onConfirm, isRenaming }) => {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  if (!isOpen) return null;

  const itemType = isFolder ? 'Folder' : 'File';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">Rename {itemType}</h2>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full h-12 px-4 bg-[#252525] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Enter new name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onConfirm(newName.trim());
              }
            }}
          />

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} disabled={isRenaming}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(newName.trim())}
              disabled={isRenaming || !newName.trim() || newName === currentName}
            >
              {isRenaming ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RECENT_SEARCHES = ['brand strategy', 'prd', 'audience', 'icp', 'tech lead'];

// Type filter options with their corresponding file type values
const TYPE_FILTER_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Folders', value: 'folder' },
  { label: 'Documents', value: 'doc' },
  { label: 'Spreadsheets', value: 'sheet' },
  { label: 'Images', value: 'image' },
  { label: 'PDFs', value: 'pdf' },
  { label: 'Files', value: 'file' },
] as const;

// Date filter options
const DATE_FILTER_OPTIONS = [
  { label: 'Any time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 90 days', value: '90days' },
] as const;

// Favorites filter options
const FAVORITES_FILTER_OPTIONS = [
  { label: 'All Files', value: 'all' },
  { label: 'Favorites Only', value: 'favorites' },
] as const;

type TypeFilterValue = typeof TYPE_FILTER_OPTIONS[number]['value'];
type DateFilterValue = typeof DATE_FILTER_OPTIONS[number]['value'];
type FavoritesFilterValue = typeof FAVORITES_FILTER_OPTIONS[number]['value'];

const FileTypeIcon = ({ 
  type, 
  fileName, 
  className = "w-4 h-4" 
}: { 
  type: string; 
  fileName?: string; 
  className?: string;
}) => {
  const [hasError, setHasError] = useState(false);
  const iconName = getFileTypeIcon(fileName || '', type);
  
  // If there's an error loading the icon, show a fallback inline SVG
  if (hasError) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  
  return (
    <img 
      src={`/file-types/${iconName}.svg`}
      alt={type}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

const AdvancedSearchModal: React.FC<{ isOpen: boolean; onClose: () => void; onSearch: () => void }> = ({ isOpen, onClose, onSearch }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-[640px] bg-[#212121] border border-white/10 rounded-[32px] shadow-[0_0_100px_rgba(0,0,0,0.8)] relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white/90">Advanced search</h2>
            <button onClick={onClose} className="p-2 text-white/20 hover:text-white hover:bg-[#303030] rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Type</label>
                <select className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/80 focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all appearance-none cursor-pointer">
                  <option>Any</option>
                  <option>Folders</option>
                  <option>Documents</option>
                  <option>Spreadsheets</option>
                  <option>PDFs</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Owner</label>
                <select className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/80 focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all appearance-none cursor-pointer">
                  <option>Anyone</option>
                  <option>Owned by me</option>
                  <option>Not owned by me</option>
                  <option>Specific person...</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Location</label>
                <select className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/80 focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all appearance-none cursor-pointer">
                  <option>Anywhere</option>
                  <option>My Drive</option>
                  <option>Shared with me</option>
                  <option>Trash</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Date modified</label>
                <select className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/80 focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all appearance-none cursor-pointer">
                  <option>Any time</option>
                  <option>Today</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Has the words</label>
              <input 
                placeholder="Enter words found in the file..."
                className="w-full h-12 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-white/80 focus:outline-none focus:border-white/30 transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
            <button onClick={onClose} className="text-[13px] font-bold text-white/40 hover:text-white/60 transition-all">Reset filters</button>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" className="px-8" onClick={() => { onSearch(); onClose(); }}>Apply search</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Files: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSuggestedOpen, setIsSuggestedOpen] = useState(true);
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('all');
  const [favoritesFilter, setFavoritesFilter] = useState<FavoritesFilterValue>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string | null>(null);
  
  // Favorites state (stored in localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // User files hook for uploads
  const { 
    files: userUploadedFiles,
    folders: userFolders,
    uploading,
    createFolder,
    uploadFiles: uploadUserFiles,
    uploadFolder: uploadUserFolder,
    deleteFile: deleteUserFile,
    renameFile: renameUserFile,
    toggleFavorite: toggleUserFileFavorite,
    getFileUrl: getUserFileUrl,
  } = useUserFiles();
  
  // Create folder modal state
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // Real data state (artifacts)
  const [files, setFiles] = useState<DisplayFile[]>([]);
  const [folders, setFolders] = useState<DisplayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  
  // Thumbnail URLs for user uploaded images
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  
  // Generate thumbnail URLs for user uploaded images
  useEffect(() => {
    async function generateThumbnails() {
      const imageFiles = userUploadedFiles.filter(
        f => f.type === 'image' && f.storage_path
      );
      
      if (imageFiles.length === 0) return;
      
      const urls: Record<string, string> = {};
      
      for (const file of imageFiles) {
        if (file.storage_path && !thumbnailUrls[file.id]) {
          try {
            const { data } = await supabase.storage
              .from('user_uploads')
              .createSignedUrl(file.storage_path, 3600);
            
            if (data?.signedUrl) {
              urls[file.id] = data.signedUrl;
            }
          } catch (err) {
            console.error('Error generating thumbnail URL:', err);
          }
        }
      }
      
      if (Object.keys(urls).length > 0) {
        setThumbnailUrls(prev => ({ ...prev, ...urls }));
      }
    }
    
    generateThumbnails();
  }, [userUploadedFiles]);
  
  // Toggle favorite - handles both user uploads (database) and artifacts (localStorage)
  const handleToggleFavorite = useCallback(async (item: DisplayFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // For user uploads, use database toggle
    if (item.source === 'uploads') {
      await toggleUserFileFavorite(item.id);
    } else {
      // For artifacts, use localStorage
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });
    }
  }, [toggleUserFileFavorite]);
  
  // Helper to check if an item is favorited
  const isItemFavorited = useCallback((item: DisplayFile) => {
    if (item.source === 'uploads') {
      return item.isFavorite || false;
    }
    return favorites.has(item.id);
  }, [favorites]);
  
  // Convert user uploaded files to DisplayFile format
  const convertedUserFiles: DisplayFile[] = useMemo(() => {
    return userUploadedFiles.map(f => ({
      id: f.id,
      name: f.name,
      owner: userEmail || 'You',
      lastModified: format(new Date(f.created_at), 'MMM d, yyyy'),
      source: 'uploads',
      tags: f.tags,
      type: f.type,
      size: f.size ? `${(f.size / 1024).toFixed(1)} KB` : undefined,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userEmail || 'user'}`,
      createdBy: 'user' as const,
      storagePath: f.storage_path,
      isFavorite: f.is_favorite,
      parentFolderId: f.parent_folder_id,
    }));
  }, [userUploadedFiles, userEmail]);
  
  // Convert user folders to DisplayFile format
  const convertedUserFolders: DisplayFile[] = useMemo(() => {
    return userFolders.map(f => {
      // Count both files and subfolders inside this folder
      const fileCount = userUploadedFiles.filter(file => file.parent_folder_id === f.id).length;
      const subfolderCount = userFolders.filter(folder => folder.parent_folder_id === f.id).length;
      return {
        id: f.id,
        name: f.name,
        owner: userEmail || 'You',
        lastModified: format(new Date(f.created_at), 'MMM d, yyyy'),
        source: 'uploads',
        tags: [],
        type: 'folder' as const,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userEmail || 'user'}`,
        fileCount: fileCount + subfolderCount,
        createdBy: 'user' as const,
        parentFolderId: f.parent_folder_id,
        isFavorite: f.is_favorite,
      };
    });
  }, [userFolders, userEmail, userUploadedFiles]);
  
  // Combine artifact files with user uploaded files
  const allCombinedFiles = useMemo(() => [...files, ...convertedUserFiles], [files, convertedUserFiles]);
  const allCombinedFolders = useMemo(() => [...folders, ...convertedUserFolders], [folders, convertedUserFolders]);
  
  // Root-level folders only (for the main folders section)
  const rootFolders = useMemo(() => allCombinedFolders.filter(f => !f.parentFolderId), [allCombinedFolders]);
  
  // Filtered root folders (apply same filters as files)
  const filteredRootFolders = useMemo(() => {
    let result = rootFolders;
    
    // Apply type filter - only show folders if type is 'all' or 'folder'
    if (typeFilter !== 'all' && typeFilter !== 'folder') {
      return [];
    }
    
    // Apply favorites filter
    if (favoritesFilter === 'favorites') {
      result = result.filter(f => {
        if (f.source === 'uploads') {
          return f.isFavorite || false;
        }
        return favorites.has(f.id);
      });
    }
    
    // Apply creator filter
    if (creatorFilter !== 'all') {
      result = result.filter(f => f.owner === creatorFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(f => {
        let fileDate: Date;
        try {
          fileDate = parseISO(f.lastModified);
          if (isNaN(fileDate.getTime())) {
            fileDate = new Date(f.lastModified);
          }
        } catch {
          return true;
        }
        
        if (isNaN(fileDate.getTime())) return true;
        
        switch (dateFilter) {
          case 'today':
            return isToday(fileDate);
          case '7days':
            return isWithinInterval(fileDate, { start: subDays(now, 7), end: now });
          case '30days':
            return isWithinInterval(fileDate, { start: subDays(now, 30), end: now });
          case '90days':
            return isWithinInterval(fileDate, { start: subDays(now, 90), end: now });
          default:
            return true;
        }
      });
    }
    
    // Apply search filter
    const searchTerm = searchValue || appliedSearchQuery;
    if (searchTerm) {
      result = result.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return result;
  }, [rootFolders, typeFilter, favoritesFilter, creatorFilter, dateFilter, favorites, searchValue, appliedSearchQuery]);
  
  // Get unique creators for the creator filter
  const uniqueCreators = useMemo(() => {
    const creators = new Set<string>();
    allCombinedFiles.forEach(f => {
      if (f.owner) creators.add(f.owner);
    });
    allCombinedFolders.forEach(f => {
      if (f.owner) creators.add(f.owner);
    });
    return Array.from(creators).sort();
  }, [allCombinedFiles, allCombinedFolders]);
  
  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState<DisplayFile | null>(null);
  const [folderPath, setFolderPath] = useState<DisplayFile[]>([]);

  // File action modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DisplayFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleFileClick = (fileId: string) => {
    navigate(`/app/files/${fileId}`);
  };

  const handleFolderClick = (folder: DisplayFile) => {
    // Reset filters when entering a folder
    setTypeFilter('all');
    setDateFilter('all');
    setFavoritesFilter('all');
    setCreatorFilter('all');
    setSearchValue('');
    setAppliedSearchQuery(null);
    
    // Add current folder to path before navigating deeper
    if (currentFolder) {
      setFolderPath(prev => [...prev, currentFolder]);
    }
    setCurrentFolder(folder);
    setIsFilesOpen(true);
  };

  // Unified click handler for items (files or folders)
  const handleItemClick = (item: DisplayFile) => {
    if (item.type === 'folder') {
      handleFolderClick(item);
    } else {
      handleFileClick(item.id);
    }
  };

  const handleBackToRoot = () => {
    setCurrentFolder(null);
    setFolderPath([]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Click on "Files Library" - go to root
      handleBackToRoot();
    } else {
      // Click on a folder in the path
      const targetFolder = folderPath[index];
      setCurrentFolder(targetFolder);
      setFolderPath(prev => prev.slice(0, index));
    }
  };
  
  // Handle create folder
  const handleCreateFolder = async (name: string) => {
    setIsCreatingFolder(true);
    try {
      await createFolder(name, currentFolder?.id || null);
      setCreateFolderModalOpen(false);
    } finally {
      setIsCreatingFolder(false);
    }
  };
  
  // Handle file upload
  const handleUploadFiles = async (fileList: File[]) => {
    await uploadUserFiles(fileList, currentFolder?.id || null);
  };
  
  // Handle folder upload
  const handleUploadFolder = async (fileList: File[]) => {
    await uploadUserFolder(fileList, currentFolder?.id || null);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      await handleUploadFiles(fileList);
    }
  }, [handleUploadFiles]);

  // File action handlers
  const handleRenameClick = (file: DisplayFile) => {
    setSelectedFile(file);
    setRenameModalOpen(true);
  };

  const handleDownloadClick = (file: DisplayFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    } else if (file.outputText) {
      // For text files, create a blob and download
      const blob = new Blob([file.outputText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      toast.error('No downloadable content available');
    }
  };

  const handleDeleteClick = (file: DisplayFile) => {
    setSelectedFile(file);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFile) return;
    
    setIsDeleting(true);
    try {
      // Check if this is a user-uploaded file/folder
      if (selectedFile.source === 'uploads') {
        const success = await deleteUserFile(selectedFile.id);
        if (!success) throw new Error('Failed to delete');
      } else {
        // Artifact file
        const { error } = await supabase
          .from('artifacts')
          .delete()
          .eq('id', selectedFile.id);

        if (error) throw error;

        // Update local state for artifacts
        setFiles(prev => prev.filter(f => f.id !== selectedFile.id));
        
        // Update folders count for artifacts
        const affectedFolder = folders.find(f => selectedFile.tags?.includes(f.rawSlug || ''));
        if (affectedFolder) {
          setFolders(prev => prev.map(f => 
            f.id === affectedFolder.id 
              ? { ...f, fileCount: Math.max(0, (f.fileCount || 1) - 1) }
              : f
          ).filter(f => (f.fileCount || 0) > 0));
        }
      }

      setDeleteModalOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmRename = async (newName: string) => {
    if (!selectedFile) return;
    
    setIsRenaming(true);
    try {
      // Check if this is a user-uploaded file/folder
      if (selectedFile.source === 'uploads') {
        const success = await renameUserFile(selectedFile.id, newName);
        if (!success) throw new Error('Failed to rename');
      } else {
        // Artifact file
        const { error } = await supabase
          .from('artifacts')
          .update({ 
            metadata: { 
              display_name: newName 
            } 
          })
          .eq('id', selectedFile.id);

        if (error) throw error;

        // Update local state for artifacts
        setFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, name: newName } : f
        ));
        
        toast.success('Renamed successfully');
      }

      setRenameModalOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error('An error occurred');
    } finally {
      setIsRenaming(false);
    }
  };

  // Get files for current folder (filter by folder rawSlug matching file's agentSlug in tags OR parent folder id for user uploads)
  const currentFolderFiles = useMemo(() => {
    if (!currentFolder) return allCombinedFiles;
    
    // For artifact folders (have rawSlug), filter by tags
    // For user folders (have id), filter by parent_folder_id
    return allCombinedFiles.filter(f => {
      if (currentFolder.rawSlug) {
        return f.tags?.includes(currentFolder.rawSlug);
      }
      return f.parentFolderId === currentFolder.id;
    });
  }, [currentFolder, allCombinedFiles]);

  // Get subfolders for current folder
  const currentFolderSubfolders = useMemo(() => {
    if (!currentFolder) return [];
    // Only user folders can have subfolders (no rawSlug means user folder)
    return allCombinedFolders.filter(f => f.parentFolderId === currentFolder.id);
  }, [currentFolder, allCombinedFolders]);

  // Combined items in current folder (subfolders + files)
  const currentFolderItems = useMemo(() => {
    return [...currentFolderSubfolders, ...currentFolderFiles];
  }, [currentFolderSubfolders, currentFolderFiles]);

  // Helper function to apply filters to a list of items
  const applyFiltersToItems = useCallback((items: DisplayFile[]) => {
    let result = items;
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(f => f.type === typeFilter);
    }
    
    // Apply favorites filter
    if (favoritesFilter === 'favorites') {
      result = result.filter(f => {
        if (f.source === 'uploads') {
          return f.isFavorite || false;
        }
        return favorites.has(f.id);
      });
    }
    
    // Apply creator filter
    if (creatorFilter !== 'all') {
      result = result.filter(f => f.owner === creatorFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(f => {
        let fileDate: Date;
        try {
          fileDate = parseISO(f.lastModified);
          if (isNaN(fileDate.getTime())) {
            fileDate = new Date(f.lastModified);
          }
        } catch {
          return true;
        }
        
        if (isNaN(fileDate.getTime())) return true;
        
        switch (dateFilter) {
          case 'today':
            return isToday(fileDate);
          case '7days':
            return isWithinInterval(fileDate, { start: subDays(now, 7), end: now });
          case '30days':
            return isWithinInterval(fileDate, { start: subDays(now, 30), end: now });
          case '90days':
            return isWithinInterval(fileDate, { start: subDays(now, 90), end: now });
          default:
            return true;
        }
      });
    }
    
    // Apply search filter
    const searchTerm = searchValue || appliedSearchQuery;
    if (searchTerm) {
      result = result.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return result;
  }, [typeFilter, favoritesFilter, creatorFilter, dateFilter, favorites, searchValue, appliedSearchQuery]);

  // Filtered versions of folder contents (applies search and filters)
  const filteredCurrentFolderSubfolders = useMemo(() => {
    return applyFiltersToItems(currentFolderSubfolders);
  }, [currentFolderSubfolders, applyFiltersToItems]);

  const filteredCurrentFolderFiles = useMemo(() => {
    return applyFiltersToItems(currentFolderFiles);
  }, [currentFolderFiles, applyFiltersToItems]);

  const filteredCurrentFolderItems = useMemo(() => {
    return [...filteredCurrentFolderSubfolders, ...filteredCurrentFolderFiles];
  }, [filteredCurrentFolderSubfolders, filteredCurrentFolderFiles]);

  // Fetch artifacts on mount
  useEffect(() => {
    async function loadArtifacts() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUserEmail(user.email || undefined);
        
        const { files: artifactFiles, folders: artifactFolders } = await fetchUserArtifacts(user.id);
        
        console.log('Fetched files:', artifactFiles.length, 'folders:', artifactFolders.length);
        
        // Convert to display format
        const displayFiles = artifactFiles.map(f => toDisplayFile(f, user.email || undefined));
        const displayFolders = artifactFolders.map(f => toDisplayFolder(f));
        
        setFiles(displayFiles);
        setFolders(displayFolders);
      } catch (error) {
        console.error('Error loading artifacts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadArtifacts();
  }, []);

  // Apply filters to files
  const filteredFiles = useMemo(() => {
    // Start with the right source: folder items (including subfolders) if in folder, all combined files otherwise
    let result = currentFolder ? currentFolderItems : allCombinedFiles;
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(f => f.type === typeFilter);
    }
    
    // Apply favorites filter
    if (favoritesFilter === 'favorites') {
      result = result.filter(f => {
        // User uploads have isFavorite property, artifacts use localStorage
        if (f.source === 'uploads') {
          return f.isFavorite || false;
        }
        return favorites.has(f.id);
      });
    }
    
    // Apply creator filter
    if (creatorFilter !== 'all') {
      result = result.filter(f => f.owner === creatorFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(f => {
        // Parse the lastModified date - handle different formats
        let fileDate: Date;
        try {
          // Try parsing as ISO string first
          fileDate = parseISO(f.lastModified);
          if (isNaN(fileDate.getTime())) {
            // If that fails, try creating date from the string
            fileDate = new Date(f.lastModified);
          }
        } catch {
          return true; // Include files with unparseable dates
        }
        
        if (isNaN(fileDate.getTime())) return true;
        
        switch (dateFilter) {
          case 'today':
            return isToday(fileDate);
          case '7days':
            return isWithinInterval(fileDate, { start: subDays(now, 7), end: now });
          case '30days':
            return isWithinInterval(fileDate, { start: subDays(now, 30), end: now });
          case '90days':
            return isWithinInterval(fileDate, { start: subDays(now, 90), end: now });
          default:
            return true;
        }
      });
    }
    
    // Apply search filter (from search input or applied search query)
    const searchTerm = searchValue || appliedSearchQuery;
    if (searchTerm) {
      result = result.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return result;
  }, [currentFolder, currentFolderItems, currentFolderFiles, allCombinedFiles, typeFilter, dateFilter, favoritesFilter, creatorFilter, favorites, searchValue, appliedSearchQuery]);

  // For search dropdown suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchValue) return [];
    const source = currentFolder ? currentFolderItems : allCombinedFiles;
    return source.filter(f => f.name.toLowerCase().includes(searchValue.toLowerCase()));
  }, [currentFolder, currentFolderItems, allCombinedFiles, searchValue]);


  const handleApplyResults = () => {
    if (searchValue.trim()) {
      setAppliedSearchQuery(searchValue);
      setSearchFocused(false);
    }
  };

  const handleClearSearch = () => {
    setAppliedSearchQuery(null);
    setSearchValue('');
  };

  // When inside a folder, show a different layout
  if (currentFolder) {
    return (
      <div 
        className="animate-in fade-in duration-300 pb-20 relative" 
        onClick={() => { setActiveFilter(null); }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop Zone Overlay */}
        {isDragging && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-6 p-12 border-2 border-dashed border-white/30 rounded-3xl bg-white/5">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Upload size={40} className="text-white/60" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Drop files to upload</h3>
                <p className="text-white/50">Files will be uploaded to "{currentFolder.name}"</p>
              </div>
            </div>
          </div>
        )}
        {/* Sticky Header with Breadcrumb */}
        <div className="sticky top-0 z-40 bg-[#0B0B0C]/95 backdrop-blur-xl border-b border-white/5 -mx-6 px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button 
              onClick={() => handleBreadcrumbClick(-1)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              Files Library
            </button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronLeft size={14} className="text-white/20 rotate-180 flex-shrink-0" />
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-white/50 hover:text-white transition-colors text-sm font-medium truncate max-w-[150px]"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
            <ChevronLeft size={14} className="text-white/20 rotate-180 flex-shrink-0" />
            <span className="text-white font-medium text-sm truncate max-w-[200px]">{currentFolder.name}</span>
          </div>
          
          {/* Search Bar & Controls Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <Icons.Search />
                </div>
                <input 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={`Search in ${currentFolder.name}...`}
                  className="w-full h-10 pl-10 pr-4 bg-[#212121] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20 transition-all"
                />
              </div>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              {/* Favorites Filter */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => setActiveFilter(activeFilter === 'folder-favorites' ? null : 'folder-favorites')}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    activeFilter === 'folder-favorites' || favoritesFilter !== 'all' 
                      ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' 
                      : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  <Star size={12} className={favoritesFilter === 'favorites' ? 'fill-yellow-400' : ''} />
                  {favoritesFilter === 'favorites' ? 'Favorites' : 'All'}
                  <ChevronDown size={12} className={`transition-transform ${activeFilter === 'folder-favorites' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeFilter === 'folder-favorites' && (
                  <div className="absolute top-full right-0 mt-2 w-44 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {FAVORITES_FILTER_OPTIONS.map(opt => (
                      <button 
                        key={opt.value}
                        onClick={() => { setFavoritesFilter(opt.value); setActiveFilter(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#303030] rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                          favoritesFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {opt.value === 'favorites' && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                          {opt.label}
                        </span>
                        {favoritesFilter === opt.value && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Type Filter */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => setActiveFilter(activeFilter === 'folder-type' ? null : 'folder-type')}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    activeFilter === 'folder-type' || typeFilter !== 'all' 
                      ? 'border-white/30 text-white bg-white/5' 
                      : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {TYPE_FILTER_OPTIONS.find(o => o.value === typeFilter)?.label || 'Type'}
                  <ChevronDown size={12} className={`transition-transform ${activeFilter === 'folder-type' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeFilter === 'folder-type' && (
                  <div className="absolute top-full right-0 mt-2 w-44 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {TYPE_FILTER_OPTIONS.map(opt => (
                      <button 
                        key={opt.value}
                        onClick={() => { setTypeFilter(opt.value); setActiveFilter(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#303030] rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                          typeFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {opt.label}
                        {typeFilter === opt.value && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Date Filter */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => setActiveFilter(activeFilter === 'folder-date' ? null : 'folder-date')}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    activeFilter === 'folder-date' || dateFilter !== 'all' 
                      ? 'border-white/30 text-white bg-white/5' 
                      : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Modified'}
                  <ChevronDown size={12} className={`transition-transform ${activeFilter === 'folder-date' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeFilter === 'folder-date' && (
                  <div className="absolute top-full right-0 mt-2 w-44 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {DATE_FILTER_OPTIONS.map(opt => (
                      <button 
                        key={opt.value}
                        onClick={() => { setDateFilter(opt.value); setActiveFilter(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#303030] rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                          dateFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {opt.label}
                        {dateFilter === opt.value && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Upload Button */}
            <FileUploadButton
              onUploadFiles={handleUploadFiles}
              onUploadFolder={handleUploadFolder}
              onCreateFolder={() => setCreateFolderModalOpen(true)}
              uploading={uploading}
            />
            
            {/* View Toggle */}
            <div className="flex bg-[#212121] p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
              >
                <List size={16} strokeWidth={2} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
              >
                <Grid2x2 size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Sort Row */}
        <div className="flex items-center justify-between py-4 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white/40">
            <span>Name</span>
            <ChevronDown size={12} className="rotate-180" />
          </div>
          <span className="text-xs text-white/30">
            {filteredCurrentFolderItems.length} {filteredCurrentFolderItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Folder Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : filteredCurrentFolderItems.length === 0 ? (
          <div className="p-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#212121] flex items-center justify-center mx-auto mb-6 text-white/20">
              <Icons.Search />
            </div>
            <h3 className="text-xl font-bold text-white/90">
              {currentFolderItems.length === 0 ? 'No items in this folder' : 'No matching items'}
            </h3>
            <p className="text-sm text-white/40 mt-2">
              {currentFolderItems.length === 0 
                ? 'This folder is empty.' 
                : 'Try adjusting your search or filters.'}
            </p>
            <Button variant="secondary" className="mt-6" onClick={handleBackToRoot}>Back to Files Library</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Subfolders Section */}
            {filteredCurrentFolderSubfolders.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">Folders</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
                  {filteredCurrentFolderSubfolders.map(folder => (
                    <div 
                      key={folder.id} 
                      onClick={() => handleFolderClick(folder)}
                      className="group flex flex-col items-center transition-all duration-300 ease-out relative cursor-pointer hover:scale-105"
                    >
                      {/* Folder Actions - Top Right */}
                      <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-all">
                        {folder.source === 'uploads' ? (
                          <FolderActionsMenu
                            folder={folder}
                            onRename={handleRenameClick}
                            onToggleFavorite={(f) => handleToggleFavorite(f)}
                            onDelete={handleDeleteClick}
                          />
                        ) : (
                          <button
                            onClick={(e) => handleToggleFavorite(folder, e)}
                            className={`rounded-lg p-1.5 transition-all hover:bg-white/10 ${
                              isItemFavorited(folder) ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400'
                            }`}
                          >
                            <Star size={14} className={isItemFavorited(folder) ? 'fill-yellow-400' : ''} />
                          </button>
                        )}
                      </div>
                      <div className="w-full flex items-end justify-center relative pb-6 h-[140px]">
                        <FolderIllustration badges={folder.badges} fileCount={folder.fileCount} />
                      </div>
                      <div className="flex flex-col items-center justify-center text-center">
                        <h3 className="text-[18px] font-bold text-white/90 tracking-tight leading-none flex items-center gap-2">
                          {folder.name}
                          {isItemFavorited(folder) && (
                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                          )}
                        </h3>
                        <p className="text-white/40 text-sm font-medium mt-2">
                          {folder.fileCount ?? 0} {(folder.fileCount ?? 0) === 1 ? 'Item' : 'Items'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Files Section */}
            {filteredCurrentFolderFiles.length > 0 && (
              <section className="space-y-4">
                {filteredCurrentFolderSubfolders.length > 0 && (
                  <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">Files</h2>
                )}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 animate-in fade-in duration-200">
                    {filteredCurrentFolderFiles.map(file => (
                      <div 
                        key={file.id} 
                        onClick={() => handleFileClick(file.id)}
                        className="group flex flex-col bg-[#212121] border border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer shadow-xl hover:-translate-y-1"
                      >
                        <div className="p-5 flex items-center justify-between gap-3 bg-white/[0.02]">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileTypeIcon type={file.type} fileName={file.name} className="w-4 h-4" />
                            <span className="text-sm font-bold text-white/90 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleToggleFavorite(file, e)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isItemFavorited(file) 
                                  ? 'text-yellow-400 opacity-100' 
                                  : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                              }`}
                            >
                              <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                            </button>
                            <div className="opacity-0 group-hover:opacity-100 transition-all">
                              <FileActionsMenu
                                file={file}
                                onRename={handleRenameClick}
                                onDownload={handleDownloadClick}
                                onDelete={handleDeleteClick}
                              />
                            </div>
                          </div>
                        </div>
                        {file.type === 'image' && (file.url || thumbnailUrls[file.id]) ? (
                          <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                            <img src={file.url || thumbnailUrls[file.id]} alt={file.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                          </div>
                        ) : file.type === 'image' && file.storagePath ? (
                          <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                              <FileTypeIcon type="image" fileName={file.name} className="w-6 h-6 opacity-40" />
                            </div>
                          </div>
                        ) : file.outputText ? (
                          <div className="aspect-[4/3] bg-black/40 relative overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                            <div className="w-full h-full p-4 overflow-hidden">
                              <p className="text-[10px] leading-relaxed text-white/30 whitespace-pre-wrap break-words line-clamp-[10]">
                                {file.outputText}
                              </p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                            <div className="w-full h-full flex flex-col p-5 opacity-[0.05] space-y-3">
                               <div className="h-2 w-full bg-white rounded-full" />
                               <div className="h-2 w-[85%] bg-white rounded-full" />
                               <div className="h-2 w-[95%] bg-white rounded-full" />
                               <div className="h-2 w-[45%] bg-white rounded-full" />
                               <div className="pt-4 h-2 w-full bg-white rounded-full" />
                               <div className="h-2 w-[75%] bg-white rounded-full" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                          </div>
                        )}
                        <div className="p-5 flex items-center gap-3 mt-auto">
                          <img src={file.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10 shadow-lg" />
                          <div className="flex flex-col min-w-0">
                            <div className="text-[10px] text-white/60 font-bold truncate">{file.owner}</div>
                            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest truncate">{file.lastModified}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#181818] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-white/5">
                      {filteredCurrentFolderFiles.map(file => (
                        <div 
                          key={file.id} 
                          onClick={() => handleFileClick(file.id)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] cursor-pointer group transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              onClick={(e) => handleToggleFavorite(file, e)}
                              className={`p-1 rounded transition-all flex-shrink-0 ${
                                isItemFavorited(file) 
                                  ? 'text-yellow-400' 
                                  : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                              }`}
                            >
                              <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                            </button>
                            <FileTypeIcon type={file.type} fileName={file.name} className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium text-white/90 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-8">
                            <span className="text-xs text-white/40 w-24">{file.lastModified}</span>
                            <span className="text-xs text-white/30 w-16">{file.size || '—'}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-all">
                              <FileActionsMenu
                                file={file}
                                onRename={handleRenameClick}
                                onDownload={handleDownloadClick}
                                onDelete={handleDeleteClick}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          fileName={selectedFile?.name || ''}
          isFolder={selectedFile?.type === 'folder'}
          onClose={() => { setDeleteModalOpen(false); setSelectedFile(null); }}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />

        {/* Rename Modal */}
        <RenameModal
          isOpen={renameModalOpen}
          currentName={selectedFile?.name || ''}
          isFolder={selectedFile?.type === 'folder'}
          onClose={() => { setRenameModalOpen(false); setSelectedFile(null); }}
          onConfirm={confirmRename}
          isRenaming={isRenaming}
        />
        
        {/* Create Folder Modal */}
        <CreateFolderModal
          isOpen={createFolderModalOpen}
          onClose={() => setCreateFolderModalOpen(false)}
          onConfirm={handleCreateFolder}
          isCreating={isCreatingFolder}
        />
      </div>
    );
  }

  return (
    <div 
      className="space-y-24 animate-in fade-in duration-500 pb-20 relative" 
      onClick={() => { setActiveFilter(null); }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop Zone Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-6 p-12 border-2 border-dashed border-white/30 rounded-3xl bg-white/5">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <Upload size={40} className="text-white/60" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Drop files to upload</h3>
              <p className="text-white/50">Files will be added to your library</p>
            </div>
          </div>
        </div>
      )}
      {/* Centered Search and Filters */}
      <div className="flex flex-col items-center gap-8 max-w-[800px] mx-auto w-full pt-28">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            {appliedSearchQuery ? 'Search Results' : 'Files Library'}
          </h1>
          <p className="text-sm text-white/30 uppercase tracking-[0.2em] font-bold">
            {appliedSearchQuery ? `Finding matches for "${appliedSearchQuery}"` : 'Secure Knowledge Base'}
          </p>
        </div>
        
        {/* Search with Dropdown */}
        <div className="relative w-full z-50" onClick={(e) => e.stopPropagation()}>
          <div className={`relative w-full bg-[#212121] border border-white/10 rounded-[22px] transition-all duration-300 ${searchFocused ? 'shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/20' : 'shadow-2xl'}`}>
            <div className="flex items-center h-16 px-5 gap-4">
              <div className="text-white/30">
                <Icons.Search />
              </div>
              <input 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyResults()}
                placeholder="Search your knowledge base..."
                className="flex-1 bg-transparent text-[16px] focus:outline-none placeholder:text-white/20"
              />
              {(searchValue || appliedSearchQuery) && (
                <button onClick={handleClearSearch} className="text-white/20 hover:text-white">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {!searchValue ? (
                  <div className="p-4 space-y-1">
                    {RECENT_SEARCHES.map(term => (
                      <button 
                        key={term}
                        onClick={() => { setSearchValue(term); setAppliedSearchQuery(term); setSearchFocused(false); }}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#303030] rounded-xl transition-colors text-white/60 text-sm font-medium text-left"
                      >
                        <Icons.Search />
                        {term}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 space-y-1">
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/20">Suggested results</div>
                    {searchSuggestions.map(file => (
                      <div 
                        key={file.id} 
                        onClick={() => { setAppliedSearchQuery(file.name); setSearchFocused(false); }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-[#303030] rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <FileTypeIcon type={file.type} fileName={file.name} className="w-5 h-5" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/90 group-hover:text-white">{file.name}</span>
                            <span className="text-[11px] text-white/40">{file.owner}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-white/20">{file.lastModified}</span>
                      </div>
                    ))}
                    {searchSuggestions.length === 0 && (
                      <div className="p-12 text-center text-white/20 text-sm">No files matching "{searchValue}"</div>
                    )}
                  </div>
                )}
                <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <button 
                    onClick={() => { setIsAdvancedSearchOpen(true); setSearchFocused(false); }}
                    className="text-[13px] font-bold text-[#4285F4] hover:underline"
                  >
                    Advanced search
                  </button>
                  <button 
                    onClick={handleApplyResults}
                    className="text-[13px] font-bold text-white/40 hover:text-white/60 flex items-center gap-2"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} className="rotate-180" />
                    All results
                  </button>
                </div>
              </div>
            )}
          </div>
          {searchFocused && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10" onClick={() => setSearchFocused(false)} />
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Favorites Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'favorites' ? null : 'favorites')}
              className={`flex items-center gap-2 px-5 py-2.5 bg-[#303030] border rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'favorites' || favoritesFilter !== 'all' 
                  ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' 
                  : 'border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <Star size={12} className={favoritesFilter === 'favorites' ? 'fill-yellow-400' : ''} />
              {FAVORITES_FILTER_OPTIONS.find(o => o.value === favoritesFilter)?.label || 'All Files'}
              <ChevronDown size={10} strokeWidth={3} className={`transition-transform duration-200 ${activeFilter === 'favorites' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeFilter === 'favorites' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {FAVORITES_FILTER_OPTIONS.map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => { setFavoritesFilter(opt.value); setActiveFilter(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#303030] rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                      favoritesFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.value === 'favorites' && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                      {opt.label}
                    </span>
                    {favoritesFilter === opt.value && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'type' ? null : 'type')}
              className={`flex items-center gap-2 px-5 py-2.5 bg-[#303030] border rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'type' || typeFilter !== 'all' 
                  ? 'border-white/40 text-white bg-white/10' 
                  : 'border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {TYPE_FILTER_OPTIONS.find(o => o.value === typeFilter)?.label || 'All Types'}
              <ChevronDown size={10} strokeWidth={3} className={`transition-transform duration-200 ${activeFilter === 'type' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeFilter === 'type' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {TYPE_FILTER_OPTIONS.map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => { setTypeFilter(opt.value); setActiveFilter(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#303030] rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                      typeFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {opt.label}
                    {typeFilter === opt.value && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'date' ? null : 'date')}
              className={`flex items-center gap-2 px-5 py-2.5 bg-[#303030] border rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'date' || dateFilter !== 'all' 
                  ? 'border-white/40 text-white bg-white/10' 
                  : 'border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Recent'}
              <ChevronDown size={10} strokeWidth={3} className={`transition-transform duration-200 ${activeFilter === 'date' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeFilter === 'date' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {DATE_FILTER_OPTIONS.map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => { setDateFilter(opt.value); setActiveFilter(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#303030] rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                      dateFilter === opt.value ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {opt.label}
                    {dateFilter === opt.value && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Creator Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'creator' ? null : 'creator')}
              className={`flex items-center gap-2 px-5 py-2.5 bg-[#303030] border rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'creator' || creatorFilter !== 'all' 
                  ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' 
                  : 'border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <User size={12} />
              {creatorFilter === 'all' ? 'Creator' : creatorFilter}
              <ChevronDown size={10} strokeWidth={3} className={`transition-transform duration-200 ${activeFilter === 'creator' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeFilter === 'creator' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-80 overflow-y-auto">
                <button 
                  onClick={() => { setCreatorFilter('all'); setActiveFilter(null); }}
                  className={`w-full text-left px-4 py-3 hover:bg-[#303030] rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                    creatorFilter === 'all' ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                  }`}
                >
                  All Creators
                  {creatorFilter === 'all' && <Check size={14} className="text-white" />}
                </button>
                <div className="h-px bg-white/5 my-1" />
                {uniqueCreators.map(creator => (
                  <button 
                    key={creator}
                    onClick={() => { setCreatorFilter(creator); setActiveFilter(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#303030] rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 ${
                      creatorFilter === creator ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${creator}`}
                        alt={creator}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                      <span className="truncate">{creator}</span>
                    </span>
                    {creatorFilter === creator && <Check size={14} className="text-white flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters Button - Only show when filters are active */}
          {(typeFilter !== 'all' || dateFilter !== 'all' || favoritesFilter !== 'all' || creatorFilter !== 'all') && (
            <button 
              onClick={() => { 
                setTypeFilter('all'); 
                setDateFilter('all'); 
                setFavoritesFilter('all'); 
                setCreatorFilter('all'); 
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white/40 hover:text-white transition-colors"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Folders - Hidden if search is applied or inside a folder */}
      {!appliedSearchQuery && !currentFolder && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsSuggestedOpen(!isSuggestedOpen)}
              className="flex items-center gap-2 group cursor-pointer w-fit px-1 outline-none"
            >
              <ChevronDown 
                size={14} 
                strokeWidth={2.5}
                className={`opacity-20 group-hover:opacity-100 transition-all duration-300 ${isSuggestedOpen ? '' : '-rotate-90'}`}
              />
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">Folders</h2>
            </button>
            
            {/* New Button - Top position for visibility */}
            <FileUploadButton
              onUploadFiles={handleUploadFiles}
              onUploadFolder={handleUploadFolder}
              onCreateFolder={() => setCreateFolderModalOpen(true)}
              uploading={uploading}
            />
          </div>

          {isSuggestedOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12 animate-in fade-in slide-in-from-top-2 duration-300">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                </div>
              ) : filteredRootFolders.length === 0 ? (
                <div className="col-span-full text-center py-12 text-white/40">
                  {rootFolders.length === 0 ? 'No folders yet' : 'No folders match your filters'}
                </div>
              ) : (
                filteredRootFolders.map(folder => (
                  <div 
                    key={folder.id} 
                    onClick={() => handleFolderClick(folder)}
                    className="group flex flex-col items-center transition-all duration-300 ease-out relative cursor-pointer hover:scale-105"
                  >
                    {/* Folder Actions - Top Right */}
                    <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-all">
                      {folder.source === 'uploads' ? (
                        <FolderActionsMenu
                          folder={folder}
                          onRename={handleRenameClick}
                          onToggleFavorite={(f) => handleToggleFavorite(f)}
                          onDelete={handleDeleteClick}
                        />
                      ) : (
                        <button
                          onClick={(e) => handleToggleFavorite(folder, e)}
                          className={`rounded-lg p-1.5 transition-all hover:bg-white/10 ${
                            isItemFavorited(folder) ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400'
                          }`}
                        >
                          <Star size={14} className={isItemFavorited(folder) ? 'fill-yellow-400' : ''} />
                        </button>
                      )}
                    </div>
                    <div className="w-full flex items-end justify-center relative pb-6 h-[140px]">
                      <FolderIllustration badges={folder.badges} fileCount={folder.fileCount} />
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                      <h3 className="text-[18px] font-bold text-white/90 tracking-tight leading-none flex items-center gap-2">
                        {folder.name}
                        {/* Favorite Star - Next to name */}
                        {isItemFavorited(folder) && (
                          <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        )}
                      </h3>
                      <p className="text-white/40 text-sm font-medium mt-2">
                        {folder.fileCount ?? 0} {(folder.fileCount ?? 0) === 1 ? 'Item' : 'Items'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {/* Main Files Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => setIsFilesOpen(!isFilesOpen)}
            className="flex items-center gap-2 group cursor-pointer outline-none"
          >
            <ChevronDown 
              size={14} 
              strokeWidth={2.5}
              className={`opacity-20 group-hover:opacity-100 transition-all duration-300 ${isFilesOpen ? '' : '-rotate-90'}`}
            />
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">
              {appliedSearchQuery ? `Results for "${appliedSearchQuery}"` : 'All Files'}
            </h2>
          </button>
          
          {/* Upload Button for main view */}
          <div className="flex items-center gap-3">
            <FileUploadButton
              onUploadFiles={handleUploadFiles}
              onUploadFolder={handleUploadFolder}
              onCreateFolder={() => setCreateFolderModalOpen(true)}
              uploading={uploading}
            />
            
            <div className="flex bg-[#303030] p-1 rounded-[14px] border border-white/10">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                <List size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'}`}
              >
                <Grid2x2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {isFilesOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            ) : allCombinedFiles.length === 0 && !appliedSearchQuery ? (
              <div className="p-24 text-center">
                <div className="w-16 h-16 rounded-full bg-[#303030] flex items-center justify-center mx-auto mb-6 text-white/20">
                  <Icons.Search />
                </div>
                <h3 className="text-xl font-bold text-white/90">No files yet</h3>
                <p className="text-sm text-white/40 mt-2">Your artifacts will appear here once you start creating them.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {filteredFiles.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => handleFileClick(file.id)}
                    className="group flex flex-col bg-[#212121] border border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer shadow-xl hover:-translate-y-1"
                  >
                    <div className="p-5 flex items-center justify-between gap-3 bg-white/[0.02]">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileTypeIcon type={file.type} fileName={file.name} className="w-4 h-4" />
                        <span className="text-sm font-bold text-white/90 truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleToggleFavorite(file, e)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isItemFavorited(file) 
                              ? 'text-yellow-400 opacity-100' 
                              : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                          }`}
                        >
                          <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                          {file.type === 'folder' ? (
                            file.source === 'uploads' ? (
                              <FolderActionsMenu
                                folder={file}
                                onRename={handleRenameClick}
                                onToggleFavorite={(f) => handleToggleFavorite(f)}
                                onDelete={handleDeleteClick}
                              />
                            ) : (
                              <button
                                onClick={(e) => handleToggleFavorite(file, e)}
                                className={`rounded-lg p-1.5 transition-all hover:bg-white/10 ${
                                  isItemFavorited(file) ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400'
                                }`}
                              >
                                <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                              </button>
                            )
                          ) : (
                            <FileActionsMenu
                              file={file}
                              onRename={handleRenameClick}
                              onDownload={handleDownloadClick}
                              onDelete={handleDeleteClick}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    {file.type === 'image' && (file.url || thumbnailUrls[file.id]) ? (
                      <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                        <img src={file.url || thumbnailUrls[file.id]} alt={file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                      </div>
                    ) : file.type === 'image' && file.storagePath ? (
                      <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <FileTypeIcon type="image" fileName={file.name} className="w-6 h-6 opacity-40" />
                        </div>
                      </div>
                    ) : file.outputText ? (
                      <div className="aspect-[4/3] bg-black/40 relative overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                        <div className="w-full h-full p-4 overflow-hidden">
                          <p className="text-[10px] leading-relaxed text-white/30 whitespace-pre-wrap break-words line-clamp-[10]">
                            {file.outputText}
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden mx-4 rounded-2xl border border-white/[0.03] group-hover:border-white/10 transition-colors">
                        <div className="w-full h-full flex flex-col p-5 opacity-[0.05] space-y-3">
                           <div className="h-2 w-full bg-white rounded-full" />
                           <div className="h-2 w-[85%] bg-white rounded-full" />
                           <div className="h-2 w-[95%] bg-white rounded-full" />
                           <div className="h-2 w-[45%] bg-white rounded-full" />
                           <div className="pt-4 h-2 w-full bg-white rounded-full" />
                           <div className="h-2 w-[75%] bg-white rounded-full" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                      </div>
                    )}
                    <div className="p-5 flex items-center gap-3 mt-auto">
                      <img src={file.avatar} alt="" className="w-7 h-7 rounded-full border border-white/10 shadow-lg" />
                      <div className="flex flex-col min-w-0">
                        <div className="text-[10px] text-white/60 font-bold truncate">{file.owner}</div>
                        <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest truncate">{file.lastModified}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#212121] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-white/20 font-bold uppercase tracking-widest text-[10px]">
                      <th className="px-4 py-5 w-10"></th>
                      <th className="px-8 py-5">File Name</th>
                      <th className="px-8 py-5">Owner</th>
                      <th className="px-8 py-5">Last Activity</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredFiles.map(file => (
                      <tr 
                        key={file.id} 
                        onClick={() => handleFileClick(file.id)}
                        className="hover:bg-white/[0.03] cursor-pointer group transition-all"
                      >
                        <td className="px-4 py-5">
                          <button
                            onClick={(e) => handleToggleFavorite(file, e)}
                            className={`p-1 rounded transition-all ${
                              isItemFavorited(file) 
                                ? 'text-yellow-400' 
                                : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                            }`}
                          >
                            <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                          </button>
                        </td>
                        <td className="px-8 py-5 flex items-center gap-4">
                          <FileTypeIcon type={file.type} fileName={file.name} className="w-5 h-5" />
                          <span className="font-bold text-white/90">{file.name}</span>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                             <img src={file.avatar} alt="" className="w-6 h-6 rounded-full border border-white/10" />
                             <span className="text-white/40 font-medium">{file.owner}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-white/40 font-medium">{file.lastModified}</td>
                        <td className="px-8 py-5 text-white/20 font-bold uppercase tracking-widest text-[10px]">{file.source}</td>
                        <td className="px-8 py-5 text-right">
                          <div className="opacity-0 group-hover:opacity-100 transition-all inline-flex">
                            {file.type === 'folder' ? (
                              file.source === 'uploads' ? (
                                <FolderActionsMenu
                                  folder={file}
                                  onRename={handleRenameClick}
                                  onToggleFavorite={(f) => handleToggleFavorite(f)}
                                  onDelete={handleDeleteClick}
                                />
                              ) : (
                                <button
                                  onClick={(e) => handleToggleFavorite(file, e)}
                                  className={`rounded-lg p-1.5 transition-all hover:bg-white/10 ${
                                    isItemFavorited(file) ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400'
                                  }`}
                                >
                                  <Star size={14} className={isItemFavorited(file) ? 'fill-yellow-400' : ''} />
                                </button>
                              )
                            ) : (
                              <FileActionsMenu
                                file={file}
                                onRename={handleRenameClick}
                                onDownload={handleDownloadClick}
                                onDelete={handleDeleteClick}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {(appliedSearchQuery && filteredFiles.length === 0) && (
              <div className="p-24 text-center">
                <div className="w-16 h-16 rounded-full bg-[#303030] flex items-center justify-center mx-auto mb-6 text-white/20">
                  <Icons.Search />
                </div>
                <h3 className="text-xl font-bold text-white/90">No files found</h3>
                <p className="text-sm text-white/40 mt-2">We couldn't find any results for "{appliedSearchQuery}". Try adjusting your filters.</p>
                <Button variant="secondary" className="mt-8" onClick={handleClearSearch}>Clear search and filters</Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal 
        isOpen={isAdvancedSearchOpen} 
        onClose={() => setIsAdvancedSearchOpen(false)} 
        onSearch={handleApplyResults}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        fileName={selectedFile?.name || ''}
        isFolder={selectedFile?.type === 'folder'}
        onClose={() => { setDeleteModalOpen(false); setSelectedFile(null); }}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={renameModalOpen}
        currentName={selectedFile?.name || ''}
        isFolder={selectedFile?.type === 'folder'}
        onClose={() => { setRenameModalOpen(false); setSelectedFile(null); }}
        onConfirm={confirmRename}
        isRenaming={isRenaming}
      />
      
      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        onConfirm={handleCreateFolder}
        isCreating={isCreatingFolder}
      />
    </div>
  );
};

export default Files;
