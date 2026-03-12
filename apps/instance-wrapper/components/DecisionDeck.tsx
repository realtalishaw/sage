
import React from 'react';
import { Check } from 'lucide-react';
import { DecisionCard } from '../types';
import { Button } from './Button';

interface DecisionDeckProps {
  cards: DecisionCard[];
  onApprove: (id: string) => void;
  onReject: (id: string, feedback?: string) => void;
}

export const DecisionDeck: React.FC<DecisionDeckProps> = ({ cards, onApprove, onReject }) => {
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  if (cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="p-8 border border-[rgba(255,255,255,0.1)] rounded-[18px] bg-[#212121] text-center w-full">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Check size={24} strokeWidth={1.5} className="text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">No decisions right now</h3>
          <p className="text-sm text-white/40 mt-1">GIA will add cards when you need to approve something.</p>
        </div>
      </div>
    );
  }

  const current = cards[0];

  const handleConfirmReject = () => {
    onReject(current.id, feedback);
    setIsRejecting(false);
    setFeedback('');
  };

  const handleCancelReject = () => {
    setIsRejecting(false);
    setFeedback('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="relative group">
        {/* Background stack decoration */}
        {cards.length > 1 && (
          <div className="absolute top-2 left-2 right-2 h-full bg-white/5 border border-white/10 rounded-[18px] translate-y-2 scale-[0.98] -z-10" />
        )}
        {cards.length > 2 && (
          <div className="absolute top-4 left-4 right-4 h-full bg-white/5 border border-white/10 rounded-[18px] translate-y-4 scale-[0.96] -z-20" />
        )}

        {/* Top card with glow effect when action is required */}
        <div className="bg-[#212121] border border-white/20 p-5 rounded-[18px] shadow-2xl relative transition-all duration-300" style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.08), 0 0 40px rgba(255, 255, 255, 0.04)' }}>
          <div className="mb-3">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
              {isRejecting ? 'Help GIA Learn' : 'Action Required'}
            </span>
            <h4 className="text-[16px] font-semibold text-white/90 leading-tight mt-1">
              {isRejecting ? `Why reject: ${current.question}` : current.question}
            </h4>
          </div>
          
          {!isRejecting ? (
            <>
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Context</p>
                  <p className="text-[13px] text-white/70 leading-snug">{current.contextNotes}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Impact</p>
                  <p className="text-[13px] text-white/70 leading-snug">{current.impact}</p>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Proposed Action</p>
                  <p className="text-[13px] text-white/90 font-medium italic leading-snug">"{current.proposedAction}"</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" onClick={() => setIsRejecting(true)} className="w-full text-[13px] h-10">Reject</Button>
                <Button variant="primary" onClick={() => onApprove(current.id)} className="w-full text-[13px] h-10">Approve</Button>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                autoFocus
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Wrong priority? Bad timing? Give GIA feedback..."
                className="w-full h-28 bg-[#303030] border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all resize-none mb-3 placeholder:text-white/20"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="ghost" onClick={handleCancelReject} className="w-full text-[13px] h-10">Back</Button>
                <Button 
                  variant="primary" 
                  onClick={handleConfirmReject} 
                  className="w-full text-[13px] h-10 !bg-red-500/10 !text-red-500 !border-red-500/20 hover:!bg-red-500/20"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
