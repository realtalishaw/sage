import { supabase } from '../src/integrations/supabase/client';

export interface ArtifactFile {
  id: string;
  name: string;
  agentSlug: string;
  outputUrl: string | null;
  outputText: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface ArtifactFolder {
  name: string;
  fileCount: number;
  badges: string[];
}

// Map agent slugs to display names
function formatAgentSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Map agent slugs to creator names (for file cards)
function getCreatorName(slug: string): string {
  // Core agent is Sage
  if (slug === 'core-agent') return 'Sage';
  return formatAgentSlug(slug);
}

// Get file type from URL or metadata
function getFileType(url: string | null, metadata: Record<string, unknown> | null): 'folder' | 'file' | 'doc' | 'sheet' | 'image' | 'pdf' {
  if (!url) return 'file';
  
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.webp')) return 'image';
  if (lowerUrl.endsWith('.pdf')) return 'pdf';
  if (lowerUrl.endsWith('.md')) return 'doc';
  if (lowerUrl.endsWith('.json')) return 'file';
  if (lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.csv')) return 'sheet';
  if (lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.doc')) return 'doc';
  
  return 'file';
}

// Get badge type from URL
function getBadgeFromUrl(url: string | null): string | null {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) return 'pdf';
  if (lowerUrl.endsWith('.json')) return 'notion';
  if (lowerUrl.endsWith('.md')) return 'google-docs';
  if (lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.doc')) return 'word';
  if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) return 'google-drive';
  return null;
}

// Extract filename from URL
function getFilenameFromUrl(url: string | null): string {
  if (!url) return 'Untitled';
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    // Decode URL-encoded characters
    return decodeURIComponent(filename) || 'Untitled';
  } catch {
    // If URL parsing fails, try to extract filename directly
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Untitled';
  }
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export async function fetchUserArtifacts(userId: string): Promise<{ 
  files: ArtifactFile[], 
  folders: ArtifactFolder[] 
}> {
  console.log('Fetching artifacts for user:', userId);
  
  // Query the artifacts table
  const { data: artifacts, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching artifacts:', error);
    return { files: [], folders: [] };
  }

  if (!artifacts || artifacts.length === 0) {
    console.log('No artifacts found for user');
    return { files: [], folders: [] };
  }

  console.log('Found artifacts:', artifacts.length);

  // Group by agent_slug to create folders
  const folderMap = new Map<string, { files: ArtifactFile[]; badges: Set<string> }>();

  for (const artifact of artifacts) {
    const agentSlug = artifact.agent_slug;
    
    if (!folderMap.has(agentSlug)) {
      folderMap.set(agentSlug, { files: [], badges: new Set() });
    }
    
    const folder = folderMap.get(agentSlug)!;
    
    const file: ArtifactFile = {
      id: artifact.id,
      name: getFilenameFromUrl(artifact.output_url) || artifact.output_text?.substring(0, 50) || 'Untitled',
      agentSlug,
      outputUrl: artifact.output_url,
      outputText: artifact.output_text,
      createdAt: artifact.created_at,
      metadata: artifact.metadata as Record<string, unknown> | null,
    };
    
    folder.files.push(file);
    
    const badge = getBadgeFromUrl(artifact.output_url);
    if (badge) folder.badges.add(badge);
  }

  // Convert to arrays
  const files: ArtifactFile[] = [];
  const folders: ArtifactFolder[] = [];

  for (const [name, data] of folderMap.entries()) {
    folders.push({
      name,
      fileCount: data.files.length,
      badges: Array.from(data.badges),
    });
    files.push(...data.files);
  }

  return { files, folders };
}

// Convert artifact to display format for the UI
export function toDisplayFile(artifact: ArtifactFile, userEmail?: string): {
  id: string;
  name: string;
  owner: string;
  createdBy: 'agent' | 'user';
  lastModified: string;
  source: string;
  tags: string[];
  type: 'folder' | 'file' | 'doc' | 'sheet' | 'image' | 'pdf';
  avatar: string;
  url: string;
  outputText: string | null;
} {
  // Artifacts in this table are created by agents
  const creatorName = getCreatorName(artifact.agentSlug);
  
  return {
    id: artifact.id,
    name: artifact.name,
    owner: creatorName,
    createdBy: 'agent',
    lastModified: formatDate(artifact.createdAt),
    source: formatAgentSlug(artifact.agentSlug),
    tags: [artifact.agentSlug],
    type: getFileType(artifact.outputUrl, artifact.metadata),
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${artifact.agentSlug}`,
    url: artifact.outputUrl || '',
    outputText: artifact.outputText,
  };
}

// Convert artifact folder to display format
export function toDisplayFolder(folder: ArtifactFolder): {
  id: string;
  name: string;
  rawSlug: string;
  owner: string;
  lastModified: string;
  source: string;
  tags: string[];
  type: 'folder';
  fileCount: number;
  badges: string[];
} {
  return {
    id: `folder-${folder.name}`,
    name: formatAgentSlug(folder.name),
    rawSlug: folder.name,
    owner: 'You',
    lastModified: '',
    source: 'Artifacts',
    tags: [],
    type: 'folder',
    fileCount: folder.fileCount,
    badges: folder.badges,
  };
}
