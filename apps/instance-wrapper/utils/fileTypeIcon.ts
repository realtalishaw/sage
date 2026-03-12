/**
 * Maps file extensions and types to SVG icon names in public/file-types
 */
export const getFileTypeIcon = (fileName: string, fileType?: string): string => {
  // Handle folders first
  if (fileType === 'folder') {
    return 'folder';
  }
  
  // Extract extension from filename
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Map common extensions to icon names
  const extensionMap: Record<string, string> = {
    // Documents
    'doc': 'doc',
    'docx': 'docx',
    'txt': 'txt',
    'rtf': 'document',
    
    // Spreadsheets
    'xls': 'xls',
    'xlsx': 'xlsx',
    'csv': 'csv',
    
    // Presentations
    'ppt': 'ppt',
    'pptx': 'pptx',
    
    // PDFs
    'pdf': 'pdf',
    
    // Images
    'jpg': 'jpg',
    'jpeg': 'jpeg',
    'png': 'png',
    'gif': 'gif',
    'svg': 'svg',
    'webp': 'webp',
    'tiff': 'tiff',
    'img': 'img',
    
    // Videos
    'mp4': 'mp4',
    'avi': 'avi',
    'mov': 'video',
    'wmv': 'video',
    'mpeg': 'mpeg',
    
    // Audio
    'mp3': 'mp3',
    'wav': 'wav',
    
    // Archives
    'zip': 'zip',
    'rar': 'zip',
    '7z': 'zip',
    'dmg': 'dmg',
    
    // Code
    'js': 'js',
    'ts': 'code',
    'tsx': 'code',
    'jsx': 'code',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'sql': 'sql',
    
    // Design
    'ai': 'ai',
    'psd': 'psd',
    'fig': 'fig',
    'eps': 'eps',
    'aep': 'aep',
    
    // Other
    'exe': 'exe',
  };
  
  // First try to get icon from extension
  if (extension && extensionMap[extension]) {
    return extensionMap[extension];
  }
  
  // Fallback to file type if extension not found
  const typeMap: Record<string, string> = {
    'doc': 'docx',
    'sheet': 'spreadsheets',
    'pdf': 'pdf',
    'image': 'image',
    'file': 'document',
  };
  
  if (fileType && typeMap[fileType]) {
    return typeMap[fileType];
  }
  
  // Default fallback
  return 'default';
};
