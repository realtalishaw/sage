import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  url: string;
}

interface JsonNodeProps {
  data: unknown;
  name?: string;
  depth?: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (data === null) {
    return (
      <div className="flex items-center gap-2">
        {name && <span className="text-purple-400">"{name}"</span>}
        {name && <span className="text-white/40">:</span>}
        <span className="text-orange-400">null</span>
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        {name && <span className="text-purple-400">"{name}"</span>}
        {name && <span className="text-white/40">:</span>}
        <span className="text-blue-400">{data.toString()}</span>
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="flex items-center gap-2">
        {name && <span className="text-purple-400">"{name}"</span>}
        {name && <span className="text-white/40">:</span>}
        <span className="text-green-400">{data}</span>
      </div>
    );
  }

  if (typeof data === 'string') {
    const isUrl = data.startsWith('http://') || data.startsWith('https://');
    return (
      <div className="flex items-center gap-2">
        {name && <span className="text-purple-400">"{name}"</span>}
        {name && <span className="text-white/40">:</span>}
        {isUrl ? (
          <a href={data} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
            "{data.length > 80 ? data.substring(0, 80) + '...' : data}"
          </a>
        ) : (
          <span className="text-yellow-400">"{data.length > 100 ? data.substring(0, 100) + '...' : data}"</span>
        )}
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-1 -ml-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-white/40">:</span>}
          <span className="text-white/40">[</span>
          {!isExpanded && <span className="text-white/30">{data.length} items</span>}
          {!isExpanded && <span className="text-white/40">]</span>}
        </div>
        {isExpanded && (
          <div className="ml-4 border-l border-white/10 pl-3">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <JsonNode data={item} depth={depth + 1} />
                {index < data.length - 1 && <span className="text-white/40">,</span>}
              </div>
            ))}
            <span className="text-white/40">]</span>
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <div>
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-1 -ml-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
          {name && <span className="text-purple-400">"{name}"</span>}
          {name && <span className="text-white/40">:</span>}
          <span className="text-white/40">{'{'}</span>
          {!isExpanded && <span className="text-white/30">{entries.length} keys</span>}
          {!isExpanded && <span className="text-white/40">{'}'}</span>}
        </div>
        {isExpanded && (
          <div className="ml-4 border-l border-white/10 pl-3">
            {entries.map(([key, value], index) => (
              <div key={key} className="py-0.5">
                <JsonNode data={value} name={key} depth={depth + 1} />
                {index < entries.length - 1 && <span className="text-white/40">,</span>}
              </div>
            ))}
            <span className="text-white/40">{'}'}</span>
          </div>
        )}
      </div>
    );
  }

  return <span className="text-white/40">{String(data)}</span>;
};

export const JsonViewer: React.FC<JsonViewerProps> = ({ url }) => {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rawJson, setRawJson] = useState('');

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setRawJson(text);
        const json = JSON.parse(text);
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawJson);
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

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        title="Copy JSON"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/40" />}
      </button>
      <div className="font-mono text-sm leading-relaxed overflow-x-auto">
        <JsonNode data={data} />
      </div>
    </div>
  );
};
