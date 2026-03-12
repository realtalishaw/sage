import React, { useEffect, useState } from 'react';

interface MarkdownViewerProps {
  url: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ url }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Simple markdown rendering - convert basic markdown to HTML
  const renderMarkdown = (md: string) => {
    let html = md
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-white/90">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-6 text-white">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono text-white/80"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-2 py-0.5 rounded text-sm font-mono text-white/80">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
      // Unordered lists
      .replace(/^\s*[-*] (.*$)/gm, '<li class="ml-4 list-disc list-inside text-white/70">$1</li>')
      // Ordered lists
      .replace(/^\s*\d+\. (.*$)/gm, '<li class="ml-4 list-decimal list-inside text-white/70">$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-white/20 pl-4 my-4 text-white/60 italic">$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-8 border-white/10" />')
      // Paragraphs (lines that don't match other patterns)
      .replace(/^(?!<[h|l|p|b|c|a|u]|$)(.+)$/gm, '<p class="text-white/70 leading-relaxed mb-4">$1</p>');

    return html;
  };

  return (
    <div className="prose prose-invert max-w-none">
      <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
};
