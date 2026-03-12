import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import IPhoneMockup from "./IPhoneMockup";
import AnimatedIPhoneMockup from "./AnimatedIPhoneMockup";
import { SmsModal } from "./SmsModal";
import { SHOWCASE_CARDS, type ShowcaseData } from "../data/showcaseContent";

const ARCH_PHONE_WIDTH = 350;
const ARCH_PHONE_HEIGHT = 760;
const ARCH_VISIBLE_HEIGHT = ARCH_PHONE_HEIGHT * 0.5;
const ARCH_CENTER_SCALE = 1;
const ARCH_MIN_VIEWPORT_HEIGHT = 720;
const ARCH_MIN_CTA_GAP = 40;
const ARCH_TO_GRID_SCROLL_THRESHOLD = 140;

function renderMarkdown(content: string): ReactNode {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  const listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="mb-4 space-y-2">
        {listItems.map((item, idx) => (
          <li key={`${item}-${idx}`} className="text-sm text-white/60">
            • {item.toLowerCase()}
          </li>
        ))}
      </ul>
    );
    listItems.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={`h-${nodes.length}`} className="mb-3 mt-1 text-lg font-semibold text-white">
          {line.slice(3).toLowerCase()}
        </h3>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }

    flushList();
    nodes.push(
      <p key={`p-${nodes.length}`} className="mb-4 text-sm leading-relaxed text-white/60">
        {line.toLowerCase()}
      </p>
    );
  }

  flushList();
  return <>{nodes}</>;
}

function Card({
  data,
  style,
  className,
  onClick,
}: {
  data: ShowcaseData;
  style?: CSSProperties;
  className?: string;
  onClick: () => void;
}) {
  const formattedMessages = data.messages.map((msg, idx) => ({
    id: `${data.id}-${idx}`,
    text: msg.text,
    image: msg.imageUrl,
    sender: msg.side === 'right' ? 'me' as const : 'them' as const,
    status: msg.status as 'read' | 'delivered' | undefined,
  }));

  return (
    <motion.div
      onClick={onClick}
      className={`group relative w-full cursor-pointer text-left lowercase ${className ?? ""}`}
      style={style}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div layoutId={`phone-${data.id}`} className="relative">
        <div className="grayscale transition-all duration-500 group-hover:grayscale-0">
          <IPhoneMockup messages={formattedMessages} contactName="sage" contactEmoji="🌱" />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
            tap to explore
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ArchLayout({
  cards,
  onCardClick,
}: {
  cards: ShowcaseData[];
  onCardClick: (card: ShowcaseData) => void;
}) {
  const displayCards = cards.slice(0, 9);
  const centerIndex = 4;

  return (
    <div
      className="relative flex w-screen items-end justify-center overflow-visible"
      style={{
        perspective: "1400px",
        height: `${ARCH_VISIBLE_HEIGHT}px`,
      }}
    >
      {displayCards.map((card, index) => {
        const distFromCenter = index - centerIndex;
        const absDist = Math.abs(distFromCenter);
        const scale = index === centerIndex ? ARCH_CENTER_SCALE : Math.max(0.8, 1 - absDist * 0.05);
        const xOffset = distFromCenter * 155;
        const yCurve = absDist * 24 + absDist * absDist * 12;
        const rotateZ = distFromCenter * 12;
        const rotateY = distFromCenter * 2;
        const opacity = 1;
        const zIndex = 50 - absDist;

        return (
          <motion.div
            key={card.id}
            layoutId={`showcase-${card.id}`}
            className="absolute origin-bottom"
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              width: ARCH_PHONE_WIDTH,
              height: ARCH_PHONE_HEIGHT,
              left: `calc(50% + ${xOffset}px - ${ARCH_PHONE_WIDTH / 2}px)`,
              bottom: -ARCH_VISIBLE_HEIGHT - yCurve,
              zIndex,
              opacity,
            }}
          >
            <div
              className="h-full w-full"
              style={{
                transform: `scale(${scale}) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`,
                transformStyle: "preserve-3d",
                transformOrigin: "50% 100%",
              }}
            >
              <Card data={card} className="h-full" onClick={() => onCardClick(card)} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function MasonryGrid({
  cards,
  onCardClick,
}: {
  cards: ShowcaseData[];
  onCardClick: (card: ShowcaseData) => void;
}) {
  const [columns, setColumns] = useState(4);
  const [selectedCategory, setSelectedCategory] = useState<string>("featured");

  const categories = [
    { id: "featured", label: "featured" },
    { id: "communication", label: "communication" },
    { id: "operations", label: "operations" },
    { id: "strategy", label: "strategy" },
    { id: "automation", label: "automation" },
  ];

  const filteredCards = selectedCategory === "featured"
    ? cards
    : cards.filter(card => card.category === selectedCategory);

  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(1);
        return;
      }
      if (width < 1024) {
        setColumns(2);
        return;
      }
      if (width < 1440) {
        setColumns(3);
        return;
      }
      setColumns(4);
    };

    calculateColumns();
    window.addEventListener("resize", calculateColumns);
    return () => window.removeEventListener("resize", calculateColumns);
  }, []);

  const columnWrappers = useMemo(() => {
    const cols: ShowcaseData[][] = Array.from({ length: columns }, () => []);
    filteredCards.forEach((card, idx) => cols[idx % columns].push(card));
    return cols;
  }, [filteredCards, columns]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 pt-12 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-16 text-center"
      >
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl"
        >
          see what sage can do
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mx-auto mb-10 max-w-[700px] text-lg text-white/60"
        >
          learn how sage handles real-world tasks through step-by-step replays.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category.label}
            </button>
          ))}
        </motion.div>
      </motion.div>

      <div className="flex justify-center gap-4 sm:gap-6">
        {columnWrappers.map((colCards, colIndex) => (
          <div key={`col-${colIndex}`} className="flex w-full flex-col gap-6">
            {colCards.map((card) => (
              <motion.div
                key={card.id}
                layoutId={`showcase-${card.id}`}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Card
                  data={card}
                  style={{ aspectRatio: "9 / 19.5" }}
                  onClick={() => onCardClick(card)}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseModal({
  showcase,
  onClose,
  onGetStarted,
}: {
  showcase: ShowcaseData;
  onClose: () => void;
  onGetStarted: () => void;
}) {
  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    setTimeout(() => {
      onGetStarted();
    }, 100);
  };

  const formattedMessages = showcase.messages.map((msg, idx) => ({
    id: `${showcase.id}-${idx}`,
    text: msg.text,
    image: msg.imageUrl,
    sender: msg.side === 'right' ? 'me' as const : 'them' as const,
    status: msg.status as 'read' | 'delivered' | undefined,
  }));

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
        onClick={onClose}
      >
      <motion.button
        type="button"
        onClick={onClose}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.2 }}
        className="fixed right-6 top-6 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
      >
        <X size={20} className="text-white" />
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex h-[90vh] max-w-[1600px] gap-8 lowercase px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-center">
          <motion.div layoutId={`phone-${showcase.id}`}>
            <AnimatedIPhoneMockup messages={formattedMessages} contactName="sage" contactEmoji="🌱" autoPlay={true} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            delay: 0.15
          }}
          className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl"
        >
          <div className="border-b border-white/10 p-8 pb-6">
            <div className="mb-3 inline-block rounded-full border border-white/20 bg-white/5 px-3 py-1 backdrop-blur-sm">
              <span className="text-xs font-bold tracking-wider text-white/70">{showcase.type.toLowerCase()}</span>
            </div>
            <h2 className="mb-3 text-4xl font-bold text-white">{showcase.title.toLowerCase()}</h2>
            <p className="text-lg leading-relaxed text-white/60">{showcase.shortDescription.toLowerCase()}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <div className="space-y-6">
              {renderMarkdown(showcase.fullContent)}

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold text-white">how it works</h3>
                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <p>text sage with your request or question via imessage</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <p>she processes context from your docs, calendar, and communications</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <p>get results, insights, or completed tasks back in seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">ready to try sage?</p>
                <p className="text-xs text-white/50">get started in less than 2 minutes</p>
              </div>
              <button
                onClick={handleGetStarted}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
              >
                get started
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function LandingShowcase() {
  const [viewMode, setViewMode] = useState<"arch" | "grid">("grid");
  const [selectedCard, setSelectedCard] = useState<ShowcaseData | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const handleGetStarted = () => {
    if (isMobile()) {
      window.location.href = "sms:+12052434811&body=add%20me%20%F0%9F%98%89";
    } else {
      setShowSmsModal(true);
    }
  };

  const canUseArch = () => {
    if (window.innerHeight < ARCH_MIN_VIEWPORT_HEIGHT) return false;

    const cta = document.querySelector("[data-landing-cta='true']") as HTMLElement | null;
    if (!cta) return false;

    const ctaBottom = cta.getBoundingClientRect().bottom;
    const centerPhoneTop = window.innerHeight - ARCH_VISIBLE_HEIGHT * ARCH_CENTER_SCALE;
    return ctaBottom + ARCH_MIN_CTA_GAP <= centerPhoneTop;
  };

  useEffect(() => {
    const syncViewModeToViewport = () => {
      if (!canUseArch()) {
        setViewMode("grid");
        return;
      }

      if (window.scrollY === 0) {
        setViewMode("arch");
      }
    };

    const raf1 = requestAnimationFrame(syncViewModeToViewport);
    const raf2 = requestAnimationFrame(syncViewModeToViewport);
    window.addEventListener("resize", syncViewModeToViewport);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", syncViewModeToViewport);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > ARCH_TO_GRID_SCROLL_THRESHOLD && viewMode === "arch") {
        window.scrollTo({ top: 0 });
        setViewMode("grid");
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (viewMode === "grid" && window.scrollY === 0 && event.deltaY < -5) {
        if (canUseArch()) {
          setViewMode("arch");
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
    };
  }, [viewMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SmsModal isOpen={showSmsModal} onClose={() => setShowSmsModal(false)} />

      <section className="relative flex min-h-screen w-full flex-col items-center">
        <div className="relative flex w-full flex-1 flex-col items-center">
          <LayoutGroup>
            {viewMode === "arch" ? (
              <motion.div
                key="arch-container"
                className="pointer-events-none fixed bottom-0 left-0 z-10 flex w-full justify-center"
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="pointer-events-auto">
                  <ArchLayout cards={SHOWCASE_CARDS} onCardClick={setSelectedCard} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid-container"
                className="relative z-20 min-h-screen w-full"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <MasonryGrid cards={SHOWCASE_CARDS} onCardClick={setSelectedCard} />
              </motion.div>
            )}
          </LayoutGroup>
        </div>

        {viewMode === "arch" && <div className="invisible h-[20vh] w-full pointer-events-none" />}
      </section>

      <AnimatePresence>
        {selectedCard && (
          <ShowcaseModal
            showcase={selectedCard}
            onClose={() => setSelectedCard(null)}
            onGetStarted={handleGetStarted}
          />
        )}
      </AnimatePresence>
    </>
  );
}
