import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Video, Plus, Mic, Battery, Wifi, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';

interface Message {
  id: string;
  text?: string;
  image?: string;
  sender: 'me' | 'them';
  status?: 'read' | 'delivered';
}

interface AnimatedIPhoneMockupProps {
  messages: Message[];
  contactName?: string;
  contactEmoji?: string;
  autoPlay?: boolean;
}

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto group w-[400px] h-[854px] flex-shrink-0">
    {/* Metallic Frame with Silver Shine */}
    <div className="relative w-[400px] h-[854px] bg-[#d1d1d6] rounded-[60px] p-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-visible ring-1 ring-black/20">
      {/* Frame Gradients for Metallic Look */}
      <div className="absolute inset-0 rounded-[60px] bg-gradient-to-br from-[#f8f8f8] via-[#a1a1a6] to-[#f8f8f8] opacity-100" />
      <div className="absolute inset-[1px] rounded-[59px] bg-gradient-to-tr from-[#ffffff] via-transparent to-[#ffffff] opacity-40" />

      {/* Antenna Bands */}
      <div className="absolute top-20 left-0 w-full h-[2px] bg-black/10 z-0" />
      <div className="absolute bottom-20 left-0 w-full h-[2px] bg-black/10 z-0" />

      {/* Side Buttons - Left Side */}
      <div className="absolute left-[-3px] top-[110px] w-[3px] h-[30px] bg-gradient-to-b from-[#f8f8f8] to-[#a1a1a6] rounded-l-sm border-l border-black/10 shadow-sm" />
      <div className="absolute left-[-3px] top-[160px] w-[3px] h-[60px] bg-gradient-to-b from-[#f8f8f8] to-[#a1a1a6] rounded-l-sm border-l border-black/10 shadow-sm" />
      <div className="absolute left-[-3px] top-[230px] w-[3px] h-[60px] bg-gradient-to-b from-[#f8f8f8] to-[#a1a1a6] rounded-l-sm border-l border-black/10 shadow-sm" />

      {/* Side Buttons - Right Side */}
      <div className="absolute right-[-3px] top-[200px] w-[3px] h-[90px] bg-gradient-to-b from-[#f8f8f8] to-[#a1a1a6] rounded-r-sm border-r border-black/10 shadow-sm" />

      {/* Inner Black Bezel */}
      <div className="relative w-full h-full bg-black rounded-[58px] p-[10px] shadow-inner">
        {/* Screen Container - DARK MODE */}
        <div className="relative w-full h-full bg-black rounded-[48px] overflow-hidden flex flex-col shadow-2xl">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-50 flex items-center justify-center border border-white/5">
            <div className="w-10 h-1 bg-white/5 rounded-full absolute bottom-1.5" />
            <div className="absolute right-4 w-2 h-2 rounded-full bg-[#1a1a1a]" />
          </div>

          {/* Status Bar - WHITE TEXT */}
          <div className="h-12 flex items-center justify-between px-8 z-40 text-white font-semibold text-[15px]">
            <div className="flex-1">9:41</div>
            <div className="flex gap-1.5 items-center">
              <Signal size={16} strokeWidth={2.5} />
              <Wifi size={16} strokeWidth={2.5} />
              <Battery size={20} strokeWidth={2} className="rotate-0" />
            </div>
          </div>

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-start mb-1.5">
    <div className="bg-[#262629]/60 backdrop-blur-xl rounded-[20px] rounded-tl-[4px] px-4 py-3 border border-white/5">
      <div className="flex gap-1">
        <motion.div
          className="w-2 h-2 bg-white/40 rounded-full"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-white/40 rounded-full"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-white/40 rounded-full"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  </div>
);

const ChatBubble = ({ message, showStatus }: { message: Message; showStatus: boolean }) => {
  const isMe = message.sender === 'me';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`flex flex-col mb-1.5 ${isMe ? 'items-end' : 'items-start'} relative`}
    >
      <div className="relative max-w-[75%]">
        {message.image ? (
          <img
            src={message.image}
            alt=""
            className="rounded-[20px] max-h-[200px] object-cover shadow-sm"
          />
        ) : (
          <div
            className={`px-4 py-2 rounded-[20px] text-[16px] leading-[1.3] shadow-sm relative whitespace-pre-wrap
              ${isMe
                ? 'bg-[#007AFF] text-white rounded-tr-[4px]'
                : 'bg-[#262629]/60 backdrop-blur-xl text-white rounded-tl-[4px] border border-white/5'
              }`}
            style={isMe ? { background: 'linear-gradient(180deg, #007AFF 0%, #007AFF 100%)' } : {}}
          >
            {message.text}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMe && showStatus && message.status && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-gray-500 mt-0.5 mr-1 font-medium"
          >
            {message.status === 'read' ? 'Read' : 'Delivered'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function AnimatedIPhoneMockup({
  messages,
  contactName = 'sage',
  contactEmoji = '🌱',
  autoPlay = true
}: AnimatedIPhoneMockupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showInputTyping, setShowInputTyping] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const [messageStatuses, setMessageStatuses] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPlay || currentIndex >= messages.length) return;

    const currentMessage = messages[currentIndex];
    const isUserMessage = currentMessage.sender === 'me';

    const processMessage = async () => {
      if (isUserMessage) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        setShowInputTyping(true);
        setCurrentTypingText(currentMessage.text || '');

        const text = currentMessage.text || '';
        const typingDuration = text.length * 50;

        await new Promise(resolve => setTimeout(resolve, typingDuration + 500));

        setShowInputTyping(false);
        setCurrentTypingText('');
        setDisplayedMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(m => m.id === currentMessage.id)) {
            return prev;
          }
          return [...prev, currentMessage];
        });

        if (currentMessage.status) {
          await new Promise(resolve => setTimeout(resolve, 800));
          setMessageStatuses(prev => ({ ...prev, [currentMessage.id]: true }));

          if (currentMessage.status === 'read') {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1800));

        setCurrentIndex(prev => prev + 1);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsTyping(true);

        const text = currentMessage.text || '';
        const typingIndicatorDuration = Math.min(3000, 1500 + text.length * 20);

        await new Promise(resolve => setTimeout(resolve, typingIndicatorDuration));

        setIsTyping(false);
        setDisplayedMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(m => m.id === currentMessage.id)) {
            return prev;
          }
          return [...prev, currentMessage];
        });

        const readingTime = Math.min(4000, 2000 + text.length * 30);
        await new Promise(resolve => setTimeout(resolve, readingTime));

        setCurrentIndex(prev => prev + 1);
      }
    };

    processMessage();
  }, [currentIndex, messages, autoPlay]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedMessages, isTyping, currentTypingText]);

  return (
    <PhoneFrame>
      {/* Header - Floating Glassmorphism Style - DARK MODE */}
      <div className="absolute top-12 left-0 right-0 z-30 pointer-events-none">
        <div className="absolute inset-0 h-40 bg-gradient-to-b from-black/95 via-black/40 to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between px-4 pt-2 pointer-events-auto">
          <button
            className="w-11 h-11 rounded-full bg-[#2c2c2e]/40 backdrop-blur-xl shadow-lg border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
            onClick={(e) => e.preventDefault()}
            tabIndex={-1}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="flex flex-col items-center -mt-1">
            <div className="relative z-20">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#34C759] border-2 border-white/10 shadow-xl flex items-center justify-center text-3xl">
                {contactEmoji}
              </div>
            </div>
            <div className="mt-2 bg-[#2c2c2e]/60 backdrop-blur-xl px-4 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-1 z-10">
              <span className="text-[14px] font-semibold text-white lowercase">{contactName}</span>
              <ChevronLeft size={10} className="rotate-180 text-gray-400" strokeWidth={3} />
            </div>
          </div>

          <button
            className="w-11 h-11 rounded-full bg-[#2c2c2e]/40 backdrop-blur-xl shadow-lg border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
            onClick={(e) => e.preventDefault()}
            tabIndex={-1}
          >
            <Video size={20} fill="currentColor" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-32 pb-4 space-y-1 scroll-smooth bg-black"
        style={{ scrollbarWidth: 'none' }}
      >
        {displayedMessages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            showStatus={messageStatuses[msg.id] || false}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      <div className="px-4 pt-3 pb-10 flex items-center gap-2 bg-black relative z-40">
        <button
          className="w-8 h-8 rounded-full bg-[#1c1c1e] text-gray-400 hover:bg-[#2c2c2e] flex items-center justify-center transition-all"
          onClick={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        <div className="flex-1 relative">
          <div className="w-full bg-[#1c1c1e] border border-white/10 rounded-full py-1.5 pl-4 pr-10 text-[16px] text-white focus:outline-none focus:border-blue-500/50 transition-all min-h-[34px] flex items-center">
            {showInputTyping ? (
              <TypeAnimation
                sequence={[currentTypingText]}
                wrapper="span"
                speed={75}
                cursor={false}
                className="text-white"
              />
            ) : (
              <span className="text-gray-600">iMessage</span>
            )}
          </div>
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-500"
            onClick={(e) => e.preventDefault()}
            tabIndex={-1}
          >
            <Mic size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
