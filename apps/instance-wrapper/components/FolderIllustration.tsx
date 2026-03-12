
import React from 'react';

interface FolderIllustrationProps {
  badges?: string[];
  fileCount?: number;
}

const BadgeIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 20 }) => {
  const commonProps = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };

  switch (type) {
    case 'notion':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="#000000" />
          <path d="M16.5 6V18M7.5 6V18M7.5 6L16.5 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pdf':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="#EF4444" />
          <path d="M7 8V16H9C10.5 16 11 15 11 14V10C11 9 10.5 8 9 8H7Z" fill="white" />
          <path d="M12.5 8V16H15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M17 8V11H19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M17 11V16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'zapier':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="#FF4F00" />
          <path d="M12 4L14 10H20L10 20L12 14H4L12 4Z" fill="white" />
        </svg>
      );
    case 'google-drive':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="white" stroke="#E5E7EB" />
          <path d="M8 18L12 11L16 18H8Z" fill="#1DA462" />
          <path d="M8 18L5 12L9 6H15L12 11L8 18Z" fill="#FFC107" />
          <path d="M16 18L19 12L15 6L12 11L16 18Z" fill="#4285F4" />
        </svg>
      );
    case 'word':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="#2563EB" />
          <path d="M6 8L8 16L10 8L12 16L14 8L16 16L18 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'google-docs':
      return (
        <svg {...commonProps}>
          <rect width="24" height="24" rx="12" fill="#4285F4" />
          <path d="M7 8H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 12H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 16H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" fill="#9CA3AF" />
        </svg>
      );
  }
};

export const FolderIllustration: React.FC<FolderIllustrationProps> = ({ badges = [], fileCount = 0 }) => {
  const hasFiles = fileCount > 0;

  // Subdued, neutral gray/charcoal palette for the folder
  const colors = {
    back: "#1E1E22",
    middle: "#131316",
    front: "#2A2A2F",
    outline: "#3A3A3F"
  };

  return (
    <div className="relative w-[140px] h-[110px] flex items-end justify-center group">
      {/* 3D Folder Graphic */}
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-[1.03]">
        {/* Back Plate - Rounded Tab - Flushed with bottom */}
        <path 
          d="M10 10C4.47715 10 0 14.4772 0 20V30V85C0 90.5228 4.47715 95 10 95H110C115.523 95 120 90.5228 120 85V30C120 24.4772 115.523 20 110 20H60C55 20 50 10 45 10H10Z" 
          fill={colors.back} 
        />
        
        {/* Inner Shadow/Depth */}
        <path d="M10 30H110V85C110 90.5228 105.523 95 100 95H20C14.4772 95 10 90.5228 10 85V30Z" fill={colors.middle} />
        
        {/* Animated Papers */}
        {hasFiles && (
          <>
            <g className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-4">
              <rect x="20" y="38" width="80" height="50" rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" transform="rotate(-3 60 90)" />
            </g>
            <g className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75 group-hover:-translate-y-6">
              <rect x="20" y="38" width="80" height="50" rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" transform="rotate(2 60 90)" />
            </g>
            <g className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-100 group-hover:-translate-y-8">
              <rect x="20" y="38" width="80" height="50" rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" />
              <line x1="32" y1="48" x2="88" y2="48" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="32" y1="56" x2="88" y2="56" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
              <line x1="32" y1="64" x2="68" y2="64" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
            </g>
          </>
        )}

        {/* Front Plate - Fully Rounded Corners */}
        <path 
          d="M10 35C4.47715 35 0 39.4772 0 45V85C0 90.5228 4.47715 95 10 95H110C115.523 95 120 90.5228 120 85V45C120 39.4772 115.523 35 110 35H10Z" 
          fill={colors.front} 
          stroke={colors.outline} 
          strokeWidth="1" 
        />
        
        {/* Subtle Highlight */}
        <path d="M10 35H110V40H0V45C0 39.4772 4.47715 35 10 35Z" fill="white" fillOpacity="0.03" />
      </svg>

    </div>
  );
};
