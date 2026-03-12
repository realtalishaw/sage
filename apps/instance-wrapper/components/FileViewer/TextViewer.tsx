import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface TextViewerProps {
  url: string;
}

export const TextViewer: React.FC<TextViewerProps> = ({ url }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 p-8 text-center">
        <p>Error loading file: {error}</p>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors z-10"
        title="Copy content"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/40" />}
      </button>
      <div className="font-mono text-sm bg-black/20 rounded-xl p-4 overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-white/5">
                <td className="pr-4 text-white/20 text-right select-none w-12 align-top">
                  {index + 1}
                </td>
                <td className="text-white/70 whitespace-pre">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
