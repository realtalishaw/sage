
import React from 'react';
import { Home, FolderClosed, LayoutGrid, Settings, Search, Plus, ArrowRight, UserRound } from 'lucide-react';

export const THEME = {
  bg: '#0b0b0b',
  surface: '#212121',
  surface2: '#212121',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.64)',
  textFaint: 'rgba(255,255,255,0.42)',
  accent: 'rgba(255,255,255,0.92)',
};

// Icon definitions using Lucide icons
export const Icons = {
  Home: (props: React.SVGProps<SVGSVGElement>) => <Home size={20} {...props} />,
  Files: (props: React.SVGProps<SVGSVGElement>) => <FolderClosed size={20} {...props} />,
  Apps: (props: React.SVGProps<SVGSVGElement>) => <LayoutGrid size={20} {...props} />,
  Agents: (props: React.SVGProps<SVGSVGElement>) => <UserRound size={20} {...props} />,
  Settings: (props: React.SVGProps<SVGSVGElement>) => <Settings size={20} {...props} />,
  Search: (props: React.SVGProps<SVGSVGElement>) => <Search size={18} {...props} />,
  Plus: (props: React.SVGProps<SVGSVGElement>) => <Plus size={18} {...props} />,
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => <ArrowRight size={18} {...props} />,
};
