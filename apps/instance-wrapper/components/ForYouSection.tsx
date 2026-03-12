
import React, { useState, useEffect } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../src/integrations/supabase/client';

interface ShowcaseData {
  id: string;
  title: string;
  type: string;
  short_description: string;
  full_content: string;
  image_url: string;
  aspect_ratio: number;
  cta_text: string | null;
  cta_url: string | null;
}

// Fallback data in case database is empty
const FALLBACK_CARDS: ShowcaseData[] = [
  { id: 'card-0', title: 'Pre-Meeting Intelligence', type: 'Meetings', short_description: 'Get briefed before every meeting with context from Slack, docs, and your tools.', full_content: '', image_url: 'https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&q=80&w=800', aspect_ratio: 1.2, cta_text: null, cta_url: null },
  { id: 'card-1', title: 'Company Knowledge Search', type: 'Knowledge', short_description: 'Find anything across all your tools, conversations, and documents instantly.', full_content: '', image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800', aspect_ratio: 0.9, cta_text: null, cta_url: null },
  { id: 'card-2', title: 'Smart Client Follow-ups', type: 'Communication', short_description: 'Never miss a follow-up with automatic reminders based on your conversations.', full_content: '', image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800', aspect_ratio: 1.1, cta_text: null, cta_url: null },
];

const parseMarkdown = (content: string): React.ReactNode[] => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-2 mb-4">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
              <span className="text-white/30 mt-1">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const formatInline = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/80 font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-white mb-4 mt-6 first:mt-0">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-white/90 mb-3 mt-5">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p 
          key={key++} 
          className="text-white/60 text-sm leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
  }
  
  flushList();
  return elements;
};

const ShowcaseModal: React.FC<{
  showcase: ShowcaseData | null;
  onClose: () => void;
}> = ({ showcase, onClose }) => {
  if (!showcase) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Section */}
          <div className="relative w-full md:w-1/2 h-48 md:h-auto md:min-h-[500px] flex-shrink-0">
            <img
              src={showcase.image_url}
              alt={showcase.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {showcase.type}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-0 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{showcase.title}</h2>
                <p className="text-white/50 text-sm">{showcase.short_description}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="prose prose-invert prose-sm max-w-none">
                {parseMarkdown(showcase.full_content)}
              </div>
            </div>

            {/* CTA */}
            {showcase.cta_text && (
              <div className="p-6 pt-0">
                <a
                  href={showcase.cta_url || '/activate'}
                  className="block w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl text-center transition-all"
                >
                  {showcase.cta_text}
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Card: React.FC<{
  data: ShowcaseData;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  layoutId?: string;
  onClick?: () => void;
}> = ({ data, className, priority, style, layoutId, onClick }) => {
  return (
    <motion.div
      layoutId={layoutId}
      className={`relative group overflow-hidden rounded-[18px] bg-[#212121] border border-white/5 cursor-pointer ${className || ''}`}
      style={{
        ...style,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      whileHover={{
        y: -6,
        scale: 1.03,
        borderColor: 'rgba(255,255,255,0.15)',
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
      }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={onClick}
    >
      <div className="block w-full h-full">
        <div className="relative w-full h-[60%] overflow-hidden bg-white/5">
          <img
            src={data.image_url}
            alt={data.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.08]"
            loading={priority ? "eager" : "lazy"}
          />
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-sm z-10">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {data.type}
            </span>
          </div>
        </div>
        <div className="p-5 h-[40%] flex flex-col justify-between">
          <div>
            <h3 className="text-white/90 text-[15px] font-bold leading-snug mb-2 group-hover:text-white transition-colors">
              {data.title}
            </h3>
            <p className="text-white/40 text-[12px] leading-relaxed line-clamp-2">
              {data.short_description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ArchLayout: React.FC<{ cards: ShowcaseData[]; onCardClick: (card: ShowcaseData) => void }> = ({ cards, onCardClick }) => {
  const displayCards = cards.slice(0, 9);
  const centerIndex = 4;

  return (
    <div className="relative w-screen h-[450px] sm:h-[500px] md:h-[550px] flex justify-center items-end pb-0 overflow-visible" style={{ perspective: '1200px' }}>
      {displayCards.map((card, index) => {
        const distFromCenter = index - centerIndex;
        const absDist = Math.abs(distFromCenter);

        const scale = centerIndex === index ? 1.05 : Math.max(0.85, 1.0 - (absDist * 0.04));
        const zIndex = 50 - absDist;
        const xOffset = distFromCenter * 110;
        const yCurve = absDist * 20 + (absDist * absDist * 10);
        const rotateZ = distFromCenter * 12;
        const rotateY = distFromCenter * 2;
        const opacity = centerIndex === index ? 1 : Math.max(0.6, 1 - (absDist * 0.1));

        const targetState = { opacity, x: xOffset, y: yCurve, scale, rotateZ, rotateY, zIndex };

        return (
          <motion.div
            key={card.id}
            className="absolute origin-bottom"
            initial={targetState}
            animate={targetState}
            transition={{ duration: 0.8, type: "spring", stiffness: 90, damping: 20 }}
            style={{
              width: 260,
              height: 360,
              bottom: -20,
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 120%'
            }}
          >
            <Card data={card} className="w-full h-full" priority={index === centerIndex} onClick={() => onCardClick(card)} />
          </motion.div>
        );
      })}
    </div>
  );
};

const MasonryGrid: React.FC<{ cards: ShowcaseData[]; onCardClick: (card: ShowcaseData) => void }> = ({ cards, onCardClick }) => {
  const [columns, setColumns] = useState(4);

  // Calculate columns based on window width
  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(1); // Mobile
      } else if (width < 1024) {
        setColumns(2); // Tablet
      } else if (width < 1440) {
        setColumns(3); // Small desktop
      } else {
        setColumns(4); // Large desktop
      }
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  const columnWrappers: ShowcaseData[][] = Array.from({ length: columns }, () => []);
  cards.forEach((card, i) => columnWrappers[i % columns].push(card));

  return (
    <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-10 pb-20 pt-12">
      <div className="flex gap-4 sm:gap-6 justify-center">
        {columnWrappers.map((colCards, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-6 w-full">
            {colCards.map((card, cardIndex) => (
              <motion.div
                key={card.id}
                layoutId={`grid-${card.id}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0, rotateZ: 0, rotateY: 0, scale: 1 }}
                transition={{
                  duration: 0.8,
                  ease: [0.25, 0.1, 0.25, 1],
                  delay: (colIndex * 0.05) + (cardIndex * 0.05)
                }}
              >
                <Card
                  data={card}
                  style={{ aspectRatio: `3/${card.aspect_ratio * 3.5}` }}
                  onClick={() => onCardClick(card)}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ForYouSection: React.FC = () => {
  const [viewMode, setViewMode] = useState<'arch' | 'grid'>('arch');
  const [showcases, setShowcases] = useState<ShowcaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseData | null>(null);

  // Check viewport height and skip arch if < 700px
  useEffect(() => {
    const checkViewportHeight = () => {
      if (window.innerHeight < 700) {
        setViewMode('grid');
      } else if (window.innerHeight >= 700 && window.scrollY === 0) {
        // Only switch back to arch if we're at top and height is sufficient
        setViewMode(prev => prev === 'grid' ? 'arch' : prev);
      }
    };

    // Check on mount
    checkViewportHeight();
    
    // Also check on resize
    window.addEventListener('resize', checkViewportHeight);
    return () => window.removeEventListener('resize', checkViewportHeight);
  }, []);

  // Fetch showcases from database
  useEffect(() => {
    const fetchShowcases = async () => {
      const { data, error } = await supabase
        .from('fyp_showcases')
        .select('id, title, type, short_description, full_content, image_url, aspect_ratio, cta_text, cta_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        setShowcases(FALLBACK_CARDS);
      } else {
        setShowcases(data);
      }
      setLoading(false);
    };

    fetchShowcases();
  }, []);

  // Force scroll to top on mount
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 60 && viewMode === 'arch') {
        window.scrollTo({ top: 0 });
        setViewMode('grid');
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (viewMode === 'arch' && e.deltaY > 0) {
        window.scrollTo({ top: 0 });
        setViewMode('grid');
      }
      if (viewMode === 'grid' && window.scrollY === 0 && e.deltaY < -5) {
        setViewMode('arch');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);

  const handleCardClick = (card: ShowcaseData) => {
    setSelectedShowcase(card);
  };

  if (loading) {
    return (
      <section className="relative w-full min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </section>
    );
  }

  return (
    <>
      <section className="relative w-full min-h-screen flex flex-col items-center">
        <div className="w-full flex-1 flex flex-col items-center relative">
          <LayoutGroup>
            {viewMode === 'arch' ? (
              <motion.div
                key="arch-container"
                className="fixed bottom-0 left-0 w-full z-10 flex justify-center pointer-events-none"
              >
                <div className="pointer-events-auto">
                  <ArchLayout cards={showcases} onCardClick={handleCardClick} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid-container"
                className="w-full relative z-20 min-h-screen"
              >
                <MasonryGrid cards={showcases} onCardClick={handleCardClick} />
              </motion.div>
            )}
          </LayoutGroup>
        </div>

        {viewMode === 'arch' && <div className="h-[20vh] w-full invisible pointer-events-none" />}
      </section>

      {/* Detail Modal */}
      {selectedShowcase && (
        <ShowcaseModal 
          showcase={selectedShowcase} 
          onClose={() => setSelectedShowcase(null)} 
        />
      )}
    </>
  );
};

export default ForYouSection;
