import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageViewerProps {
  url: string;
  filename: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ url, filename }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 p-4 border-b border-white/10">
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} className="text-white/60" />
        </button>
        <span className="text-white/40 text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} className="text-white/60" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-2" />
        <button
          onClick={handleRotate}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Rotate"
        >
          <RotateCw size={18} className="text-white/60" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Download"
        >
          <Download size={18} className="text-white/60" />
        </button>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-black/20">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full" />
          </div>
        )}
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-full object-contain transition-transform duration-200 rounded-lg shadow-2xl"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
};
