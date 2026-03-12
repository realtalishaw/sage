import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Loader2, ChevronUp } from 'lucide-react';
import { supabase } from '../src/integrations/supabase/client';
import { FileViewer } from '../components/FileViewer';
import { Button } from '../components/Button';

interface ArtifactData {
  id: string;
  output_url: string | null;
  output_text: string | null;
  agent_slug: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface UserFileData {
  id: string;
  name: string;
  type: string;
  mime_type: string | null;
  storage_path: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

type FileSource = 'artifact' | 'user_file';

const FileViewPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [artifact, setArtifact] = useState<ArtifactData | null>(null);
  const [userFile, setUserFile] = useState<UserFileData | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileSource, setFileSource] = useState<FileSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowScrollTop(contentRef.current.scrollTop > 200);
      }
    };

    const content = contentRef.current;
    if (content) {
      content.addEventListener('scroll', handleScroll);
      return () => content.removeEventListener('scroll', handleScroll);
    }
  }, [loading]);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    async function loadFile() {
      if (!fileId) {
        setError('No file ID provided');
        setLoading(false);
        return;
      }

      try {
        // First try to find in artifacts table
        const { data: artifactData, error: artifactError } = await supabase
          .from('artifacts')
          .select('*')
          .eq('id', fileId)
          .maybeSingle();

        if (artifactData) {
          setArtifact(artifactData as ArtifactData);
          setFileSource('artifact');
          setLoading(false);
          return;
        }

        // If not found in artifacts, try user files table
        const { data: userFileData, error: userFileError } = await supabase
          .from('files')
          .select('*')
          .eq('id', fileId)
          .maybeSingle();

        if (userFileData) {
          setUserFile(userFileData as UserFileData);
          setFileSource('user_file');
          
          // Get signed URL for the file
          if (userFileData.storage_path) {
            const { data: urlData } = await supabase.storage
              .from('user_uploads')
              .createSignedUrl(userFileData.storage_path, 3600);
            
            setFileUrl(urlData?.signedUrl || null);
          }
          
          setLoading(false);
          return;
        }

        // Neither found
        throw new Error('File not found');
      } catch (err) {
        console.error('Error loading file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setLoading(false);
      }
    }

    loadFile();
  }, [fileId]);

  const handleBack = () => {
    navigate('/app/files');
  };

  const handleDownload = async () => {
    if (fileSource === 'artifact' && artifact?.output_url) {
      const link = document.createElement('a');
      link.href = artifact.output_url;
      link.download = getFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (fileSource === 'user_file' && userFile?.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from('user_uploads')
          .download(userFile.storage_path);
        
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = userFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error downloading file:', err);
      }
    }
  };

  const handleOpenExternal = () => {
    const url = fileSource === 'artifact' ? artifact?.output_url : fileUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getFilename = (): string => {
    if (fileSource === 'user_file' && userFile) {
      return userFile.name;
    }
    
    if (!artifact?.output_url) return 'Untitled';
    try {
      const urlObj = new URL(artifact.output_url);
      const pathParts = urlObj.pathname.split('/');
      return decodeURIComponent(pathParts[pathParts.length - 1]) || 'Untitled';
    } catch {
      const parts = artifact.output_url.split('/');
      return parts[parts.length - 1] || 'Untitled';
    }
  };

  const formatAgentSlug = (slug: string): string => {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const getSubtitle = (): string => {
    if (fileSource === 'user_file' && userFile) {
      return `User Upload • ${new Date(userFile.created_at).toLocaleDateString()}`;
    }
    if (artifact) {
      return `${formatAgentSlug(artifact.agent_slug)} • ${new Date(artifact.created_at).toLocaleDateString()}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || (!artifact && !userFile)) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white/90 mb-2">File not found</h2>
          <p className="text-white/40">{error || 'The file you are looking for does not exist.'}</p>
        </div>
        <Button variant="secondary" onClick={handleBack}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Files
        </Button>
      </div>
    );
  }

  const filename = getFilename();
  const displayUrl = fileSource === 'artifact' ? artifact?.output_url : fileUrl;

  return (
    <div className="h-full flex flex-col -mx-10 -my-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0b0b0b]">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white/90 truncate max-w-[400px]">
              {filename}
            </h1>
            <p className="text-xs text-white/40">
              {getSubtitle()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-white/60"
          >
            <Download size={16} />
            Download
          </button>
          {displayUrl && (
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-white/60"
            >
              <ExternalLink size={16} />
              Open
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-auto p-8 bg-[#121212]">
        <div className="max-w-4xl mx-auto">
          {displayUrl ? (
            <FileViewer 
              url={displayUrl} 
              filename={filename}
              mimeType={userFile?.mime_type || undefined}
            />
          ) : artifact?.output_text ? (
            <div className="prose prose-invert max-w-none">
              <pre className="bg-black/20 p-6 rounded-xl text-white/70 whitespace-pre-wrap">
                {artifact.output_text}
              </pre>
            </div>
          ) : (
            <div className="text-center py-20 text-white/40">
              No content available for this file.
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Top FAB */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full shadow-lg transition-all duration-300 z-20"
          aria-label="Scroll to top"
        >
          <ChevronUp size={24} className="text-white/80" />
        </button>
      )}
    </div>
  );
};

export default FileViewPage;
