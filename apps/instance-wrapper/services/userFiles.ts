import { supabase } from '../src/integrations/supabase/client';

export interface UserFile {
  id: string;
  user_id: string;
  name: string;
  type: 'file' | 'folder' | 'doc' | 'sheet' | 'image' | 'pdf';
  mime_type: string | null;
  size: number | null;
  parent_folder_id: string | null;
  storage_path: string | null;
  is_favorite: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Determine file type from mime type
function getFileType(mimeType: string): UserFile['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'sheet';
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType === 'text/plain' || mimeType === 'text/markdown') return 'doc';
  return 'file';
}

// Fetch all user files
export async function fetchUserFiles(userId: string): Promise<UserFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user files:', error);
    throw error;
  }

  return (data || []) as UserFile[];
}

// Create a folder
export async function createFolder(
  userId: string, 
  name: string, 
  parentFolderId: string | null = null
): Promise<UserFile> {
  const { data, error } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      name,
      type: 'folder',
      parent_folder_id: parentFolderId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  return data as UserFile;
}

// Upload a file
export async function uploadFile(
  userId: string,
  file: File,
  parentFolderId: string | null = null
): Promise<UserFile> {
  // Generate storage path: {user_id}/{uuid}_{filename}
  const fileExt = file.name.split('.').pop();
  const uniqueId = crypto.randomUUID();
  const storagePath = `${userId}/${uniqueId}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('user_uploads')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading file to storage:', uploadError);
    throw uploadError;
  }

  // Create file record in database
  const fileType = getFileType(file.type);
  const { data, error: dbError } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      name: file.name,
      type: fileType,
      mime_type: file.type,
      size: file.size,
      parent_folder_id: parentFolderId,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    // Try to clean up the uploaded file if db insert fails
    await supabase.storage.from('user_uploads').remove([storagePath]);
    console.error('Error creating file record:', dbError);
    throw dbError;
  }

  return data as UserFile;
}

// Upload multiple files
export async function uploadFiles(
  userId: string,
  files: File[],
  parentFolderId: string | null = null
): Promise<UserFile[]> {
  const uploadedFiles: UserFile[] = [];
  
  for (const file of files) {
    try {
      const uploaded = await uploadFile(userId, file, parentFolderId);
      uploadedFiles.push(uploaded);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      // Continue with remaining files
    }
  }
  
  return uploadedFiles;
}

// Delete a file or folder
export async function deleteUserFile(fileId: string, storagePath: string | null): Promise<void> {
  // Delete from storage if it's a file (not a folder)
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from('user_uploads')
      .remove([storagePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue to delete record anyway
    }
  }

  // Delete from database (will cascade delete children if folder)
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (error) {
    console.error('Error deleting file record:', error);
    throw error;
  }
}

// Rename a file or folder
export async function renameUserFile(fileId: string, newName: string): Promise<UserFile> {
  const { data, error } = await supabase
    .from('files')
    .update({ name: newName })
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    console.error('Error renaming file:', error);
    throw error;
  }

  return data as UserFile;
}

// Toggle favorite status
export async function toggleFileFavorite(fileId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('files')
    .update({ is_favorite: isFavorite })
    .eq('id', fileId);

  if (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}

// Move file to folder
export async function moveFile(fileId: string, newParentFolderId: string | null): Promise<void> {
  const { error } = await supabase
    .from('files')
    .update({ parent_folder_id: newParentFolderId })
    .eq('id', fileId);

  if (error) {
    console.error('Error moving file:', error);
    throw error;
  }
}

// Get public URL for a file
export async function getFileUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('user_uploads')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  return data?.signedUrl || '';
}

// Get download URL for a file
export async function downloadFile(storagePath: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('user_uploads')
    .download(storagePath);

  if (error) {
    console.error('Error downloading file:', error);
    throw error;
  }

  // Create download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
