import React from 'react';
import { ExternalLink, Download } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  filename: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, filename }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 p-4 border-b border-white/10">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-white/60"
        >
          <Download size={16} />
          Download
        </button>
        <button
          onClick={handleOpenExternal}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-white/60"
        >
          <ExternalLink size={16} />
          Open in new tab
        </button>
      </div>

      {/* PDF Embed */}
      <div className="flex-1 bg-black/20">
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          className="w-full h-full border-0"
          title={filename}
        />
      </div>
    </div>
  );
};
