import React from 'react';
import { MarkdownViewer } from './MarkdownViewer';
import { JsonViewer } from './JsonViewer';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { TextViewer } from './TextViewer';

interface FileViewerProps {
  url: string;
  filename: string;
  mimeType?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ url, filename, mimeType }) => {
  // Determine file type from filename extension or mimeType
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Markdown files
  if (extension === 'md' || extension === 'markdown' || mimeType === 'text/markdown') {
    return <MarkdownViewer url={url} />;
  }
  
  // JSON files
  if (extension === 'json' || mimeType === 'application/json') {
    return <JsonViewer url={url} />;
  }
  
  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) || mimeType?.startsWith('image/')) {
    return <ImageViewer url={url} filename={filename} />;
  }
  
  // PDF files
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return <PdfViewer url={url} filename={filename} />;
  }
  
  // Default to text viewer for other text-based files
  return <TextViewer url={url} />;
};

export { MarkdownViewer, JsonViewer, ImageViewer, PdfViewer, TextViewer };
