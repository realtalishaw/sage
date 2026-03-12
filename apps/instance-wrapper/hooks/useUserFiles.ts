import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { 
  UserFile, 
  fetchUserFiles, 
  createFolder, 
  uploadFile, 
  uploadFiles,
  deleteUserFile, 
  renameUserFile,
  toggleFileFavorite,
  getFileUrl 
} from '../services/userFiles';
import { toast } from 'sonner';
import { getCurrentInstanceAccess } from '../services/instanceAccess';

export function useUserFiles() {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  // Load files on mount
  useEffect(() => {
    async function loadFiles() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const instance = await getCurrentInstanceAccess();
        setUserId(user.id);
        setInstanceId(instance.instanceId);
        setUserEmail(user.email || null);

        const userFiles = await fetchUserFiles(user.id, instance.instanceId);
        setFiles(userFiles);
      } catch (error) {
        console.error('Error loading files:', error);
        toast.error('Failed to load files');
      } finally {
        setLoading(false);
      }
    }

    loadFiles();
  }, []);

  // Get folders and files separately
  const folders = files.filter(f => f.type === 'folder');
  const nonFolderFiles = files.filter(f => f.type !== 'folder');

  // Create folder
  const handleCreateFolder = useCallback(async (name: string, parentFolderId: string | null = null) => {
    if (!userId || !instanceId) return null;

    try {
      const newFolder = await createFolder(userId, instanceId, name, parentFolderId);
      setFiles(prev => [newFolder, ...prev]);
      toast.success(`Folder "${name}" created`);
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('An error occurred');
      return null;
    }
  }, [instanceId, userId]);

  // Upload single file
  const handleUploadFile = useCallback(async (file: File, parentFolderId: string | null = null) => {
    if (!userId || !instanceId) return null;

    setUploading(true);
    try {
      const newFile = await uploadFile(userId, instanceId, file, parentFolderId);
      setFiles(prev => [newFile, ...prev]);
      toast.success(`"${file.name}" uploaded`);
      return newFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('An error occurred');
      return null;
    } finally {
      setUploading(false);
    }
  }, [instanceId, userId]);

  // Upload multiple files
  const handleUploadFiles = useCallback(async (fileList: File[], parentFolderId: string | null = null) => {
    if (!userId || !instanceId) return [];

    setUploading(true);
    try {
      const newFiles = await uploadFiles(userId, instanceId, fileList, parentFolderId);
      setFiles(prev => [...newFiles, ...prev]);
      if (newFiles.length > 0) {
        toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded`);
      }
      return newFiles;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('An error occurred');
      return [];
    } finally {
      setUploading(false);
    }
  }, [instanceId, userId]);

  // Upload a folder (creates the folder first, then uploads all files into it)
  const handleUploadFolder = useCallback(async (fileList: File[], parentFolderId: string | null = null) => {
    if (!userId || !instanceId || fileList.length === 0) return [];

    setUploading(true);
    try {
      // Get the folder name from the first file's webkitRelativePath
      const firstFile = fileList[0];
      const relativePath = (firstFile as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const folderName = relativePath.split('/')[0];
      
      if (!folderName) {
        // Fallback to regular upload if no folder structure
        return await handleUploadFiles(fileList, parentFolderId);
      }

      // Create the folder first
      const newFolder = await createFolder(userId, instanceId, folderName, parentFolderId);
      setFiles(prev => [newFolder, ...prev]);
      
      // Upload all files into the new folder
      const newFiles = await uploadFiles(userId, instanceId, fileList, newFolder.id);
      setFiles(prev => [...newFiles, ...prev]);
      
      toast.success(`Folder "${folderName}" uploaded with ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''}`);
      return newFiles;
    } catch (error) {
      console.error('Error uploading folder:', error);
      toast.error('An error occurred');
      return [];
    } finally {
      setUploading(false);
    }
  }, [handleUploadFiles, instanceId, userId]);

  // Delete file
  const handleDeleteFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return false;

    try {
      await deleteUserFile(fileId, file.storage_path);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success(`"${file.name}" deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('An error occurred');
      return false;
    }
  }, [files]);

  // Rename file
  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    try {
      const updated = await renameUserFile(fileId, newName);
      setFiles(prev => prev.map(f => f.id === fileId ? updated : f));
      toast.success('File renamed');
      return true;
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('An error occurred');
      return false;
    }
  }, []);

  // Toggle favorite
  const handleToggleFavorite = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newFavorite = !file.is_favorite;
    
    // Optimistic update
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, is_favorite: newFavorite } : f
    ));

    try {
      await toggleFileFavorite(fileId, newFavorite);
    } catch (error) {
      // Revert on error
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, is_favorite: !newFavorite } : f
      ));
      console.error('Error toggling favorite:', error);
    }
  }, [files]);

  // Get file URL
  const handleGetFileUrl = useCallback(async (storagePath: string): Promise<string> => {
    try {
      return await getFileUrl(storagePath);
    } catch (error) {
      console.error('Error getting file URL:', error);
      return '';
    }
  }, []);

  // Refresh files
  const refreshFiles = useCallback(async () => {
    if (!userId || !instanceId) return;
    
    try {
      const userFiles = await fetchUserFiles(userId, instanceId);
      setFiles(userFiles);
    } catch (error) {
      console.error('Error refreshing files:', error);
    }
  }, [instanceId, userId]);

  return {
    files: nonFolderFiles,
    folders,
    allFiles: files,
    loading,
    uploading,
    userId,
    userEmail,
    createFolder: handleCreateFolder,
    uploadFile: handleUploadFile,
    uploadFiles: handleUploadFiles,
    uploadFolder: handleUploadFolder,
    deleteFile: handleDeleteFile,
    renameFile: handleRenameFile,
    toggleFavorite: handleToggleFavorite,
    getFileUrl: handleGetFileUrl,
    refreshFiles,
  };
}
