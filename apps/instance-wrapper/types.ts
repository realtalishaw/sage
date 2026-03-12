
export type RoutePath =
  | '/'
  | '/activate'
  | '/apply'
  | '/login'
  | '/approved'
  | '/onboarding'
  | '/app/home'
  | '/app/files'
  | '/app/apps'
  | '/app/agents'
  | '/app/settings';

export interface User {
  email: string;
  isLoggedIn: boolean;
  onboarded: boolean;
  isAdmin?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  me: boolean;
}

export interface WorkstreamItem {
  id: string;
  author: {
    name: string;
    avatar?: string;
    isAi: boolean;
  };
  type: 'text' | 'file' | 'decision' | 'system' | 'agent_step' | 'summary_card' | 'user_message' | 'agent_message' | 'task_started' | 'task_completed' | 'task_discovered' | 'artifact_created' | 'decision_required' | 'error' | 'success';
  content: string;
  timestamp: Date;
  reactions?: Reaction[];
  replies?: WorkstreamItem[];
  metadata?: {
    file?: GIAFile;
    decision?: DecisionCard;
    isReply?: boolean;
    replyToId?: string;
  };
}

export interface DecisionCard {
  id: string;
  question: string;
  contextNotes: string;
  impact: string;
  proposedAction: string;
}

export interface GIAFile {
  id: string;
  name: string;
  owner: string;
  lastModified: string;
  source: string;
  tags: string[];
  type: 'folder' | 'file' | 'doc' | 'sheet' | 'image' | 'pdf';
  size?: string;
  thumbnail?: string;
  avatar?: string;
  fileCount?: number;
  badges?: string[];
}

export interface GIAApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'installed' | 'not_installed';
  category: string;
  useCount: number;
}

export interface GIAFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'auto' | 'manual' | 'disabled';
  integrations: string[]; // Icons/App names
  nextRun?: string;
  history: FlowRun[];
}

export interface FlowRun {
  id: string;
  status: 'completed' | 'failed' | 'running';
  timestamp: string;
  logs: string[];
}

export interface SageAgent {
  id: string;
  name: string;
  title: string;
  status: 'online' | 'busy' | 'offline';
  avatar: string;
  bio: string;
  skills: string[];
  tools: string[];
  activeTasks: string[];
  logs: {
    id: string;
    timestamp: string;
    message: string;
  }[];
}
