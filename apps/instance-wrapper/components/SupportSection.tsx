import React from 'react';
import { MessageSquare, Edit, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { Button } from './Button';
import { submitSupportTicket, SUPPORT_TOPICS } from '@/services/support';
import { supabase } from '@/src/integrations/supabase/client';

interface SupportSectionProps {
  user: { email: string; id?: string } | null;
  firstName: string;
  lastName: string;
}

type SupportView = 'main' | 'support-form' | 'support-success' | 'feedback-form' | 'feedback-success';

export const SupportSection: React.FC<SupportSectionProps> = ({ user, firstName, lastName }) => {
  const [view, setView] = React.useState<SupportView>('main');
  
  // Support form state
  const [topic, setTopic] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isTopicOpen, setIsTopicOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ticketId, setTicketId] = React.useState<string | null>(null);

  // Feedback form state
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);

  const resetSupportForm = () => {
    setTopic('');
    setSubject('');
    setMessage('');
    setError(null);
  };

  const resetFeedbackForm = () => {
    setFeedbackMessage('');
    setFeedbackError(null);
  };

  const handleSupportSubmit = async () => {
    if (!topic || !subject || !message) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitSupportTicket({
        topic: SUPPORT_TOPICS.find(t => t.value === topic)?.label || topic,
        subject,
        message,
        userName: firstName || lastName ? `${firstName} ${lastName}`.trim() : undefined,
      });

      if (result.success) {
        setTicketId(result.ticketId || null);
        setView('support-success');
        resetSupportForm();
      } else {
        setError(result.error || 'Failed to submit ticket');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 10) {
      setFeedbackError('Please enter at least 10 characters of feedback');
      return;
    }

    if (!user?.email) {
      setFeedbackError('Please log in to submit feedback');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError(null);

    try {
      // First, save feedback to database using RPC
      const { error: submitError } = await supabase.rpc('submit_feedback', {
        p_email: user.email,
        p_feedback: feedbackMessage.trim(),
        p_ip_address: 'settings-page',
        p_user_agent: navigator.userAgent,
      });

      if (submitError) throw submitError;

      // Then, send emails via edge function
      const { error: emailError } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          feedback: feedbackMessage.trim(),
          userName: firstName || lastName ? `${firstName} ${lastName}`.trim() : undefined,
        },
      });

      if (emailError) {
        console.error('Failed to send feedback emails:', emailError);
        // Don't fail the submission if emails fail
      }

      setView('feedback-success');
      resetFeedbackForm();
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setFeedbackError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Support success view
  if (view === 'support-success') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ticket Submitted!</h2>
          <p className="text-sm text-white/40 mb-2">
            We've received your support request.
          </p>
          {ticketId && (
            <p className="text-xs text-white/30 font-mono mb-6">
              Ticket #{ticketId.slice(0, 8)}
            </p>
          )}
          <p className="text-sm text-white/60 max-w-md mb-8">
            We'll get back to you within 24 hours. Check your email for a confirmation.
          </p>
          <Button variant="secondary" onClick={() => setView('main')}>
            Back to Help Center
          </Button>
        </div>
      </div>
    );
  }

  // Feedback success view
  if (view === 'feedback-success') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-sm text-white/40 mb-6">
            Your feedback is the fuel for Sage's evolution.
          </p>
          <p className="text-sm text-white/60 max-w-md mb-8">
            We review every submission and use it to make Sage better for everyone.
          </p>
          <Button variant="secondary" onClick={() => setView('main')}>
            Back to Help Center
          </Button>
        </div>
      </div>
    );
  }

  // Support form view
  if (view === 'support-form') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Contact Support</h2>
            <p className="text-sm text-white/40">We'll respond within 24 hours.</p>
          </div>
          <button
            onClick={() => {
              setView('main');
              resetSupportForm();
            }}
            className="text-white/20 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Topic Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Topic
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTopicOpen(!isTopicOpen)}
                className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm text-left flex items-center justify-between focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
              >
                <span className={topic ? 'text-white' : 'text-white/40'}>
                  {topic ? SUPPORT_TOPICS.find(t => t.value === topic)?.label : 'Select a topic...'}
                </span>
                <ChevronDown size={16} className={`text-white/40 transition-transform ${isTopicOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTopicOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#303030] border border-white/10 rounded-xl overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                  {SUPPORT_TOPICS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setTopic(t.value);
                        setIsTopicOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors flex items-center justify-between ${
                        topic === t.value ? 'text-white bg-white/5' : 'text-white/60'
                      }`}
                    >
                      {t.label}
                      {topic === t.value && <Check size={16} className="text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              maxLength={200}
              className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/30"
            />
            <p className="text-[10px] text-white/20 mt-1 text-right">{subject.length}/200</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              maxLength={5000}
              rows={6}
              className="w-full bg-[#303030] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/30 resize-none"
            />
            <p className="text-[10px] text-white/20 mt-1 text-right">{message.length}/5000</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full h-11"
            onClick={handleSupportSubmit}
            disabled={isSubmitting || !topic || !subject || !message}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Feedback form view
  if (view === 'feedback-form') {
    return (
      <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header - stays at top */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Share Your Feedback</h2>
            <p className="text-sm text-white/40">Help us shape the future of Sage.</p>
          </div>
          <button
            onClick={() => {
              setView('main');
              resetFeedbackForm();
            }}
            className="text-white/20 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form - vertically centered in remaining space */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-6">
            {/* Feedback Message */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                Your Feedback
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Found a bug? Have a feature request? Tell us what's on your mind..."
                minLength={10}
                maxLength={5000}
                rows={8}
                className="w-full bg-[#303030] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/30 resize-none"
              />
              <p className="text-[10px] text-white/20 mt-1 text-right">{feedbackMessage.length}/5000 (min 10)</p>
            </div>

            {feedbackError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{feedbackError}</p>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full h-11"
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitting || feedbackMessage.trim().length < 10}
            >
              {feedbackSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Help & Feedback</h2>
        <p className="text-sm text-white/40">We're here to help you get the most out of Sage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => setView('support-form')}
          className="p-8 bg-[#212121] border border-white/5 rounded-[28px] flex flex-col items-center text-center group hover:bg-white/[0.02] hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center text-white/40 mb-6 group-hover:text-white transition-all">
            <MessageSquare size={24} />
          </div>
          <h4 className="text-lg font-bold">Customer Support</h4>
          <p className="text-xs text-white/30 mt-2 mb-6">Talk to a human representative about account issues.</p>
          <Button variant="secondary" className="w-full">Chat with us</Button>
        </div>

        <div
          onClick={() => setView('feedback-form')}
          className="p-8 bg-[#212121] border border-white/5 rounded-[28px] flex flex-col items-center text-center group hover:bg-white/[0.02] hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#303030] border border-white/10 flex items-center justify-center text-white/40 mb-6 group-hover:text-white transition-all">
            <Edit size={24} />
          </div>
          <h4 className="text-lg font-bold">Give Feedback</h4>
          <p className="text-xs text-white/30 mt-2 mb-6">Help us shape the future of General Intelligence.</p>
          <Button variant="secondary" className="w-full">Submit ideas</Button>
        </div>
      </div>

      <div className="p-6 bg-[#303030] border border-white/5 rounded-[22px] flex items-center justify-center gap-4">
        <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">VERSION: PRIVATE ALPHA 0.8.2</span>
        <span className="text-white/10">•</span>
        <a href="#" className="text-[10px] uppercase font-bold text-white/20 hover:text-white/40 tracking-widest transition-colors">DOCUMENTATION</a>
      </div>
    </div>
  );
};
