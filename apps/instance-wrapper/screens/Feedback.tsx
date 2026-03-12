
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import Footer from '../components/Footer';
import { supabase } from '@/src/integrations/supabase/client';
import { sendFeedbackEmail } from '../services/feedback';

const Feedback: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      // Submit feedback using the RPC function (handles rate limiting and validation)
      const { data: feedbackId, error: submitError } = await supabase.rpc(
        'submit_feedback',
        {
          p_email: email.trim(),
          p_feedback: message.trim(),
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
        }
      );

      if (submitError) throw submitError;

      // Send confirmation email (don't fail the submission if email fails)
      try {
        await sendFeedbackEmail(email.trim(), message.trim());
      } catch (emailError) {
        // Log the error but don't fail the submission
        console.error('Failed to send confirmation email:', emailError);
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-8 max-w-[1040px] mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-bold text-xl tracking-tighter">GIA</span>
        </Link>
        <Link to="/activate">
          <Button variant="primary" size="sm" className="rounded-full px-5">Get started</Button>
        </Link>
      </header>

      <main className="flex-1 max-w-[600px] mx-auto px-6 py-20 flex flex-col items-center justify-center">
        {submitted ? (
          <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
              <Check size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Thank you.</h1>
            <p className="text-white/40 text-lg mb-10 leading-relaxed">
              Your feedback is the fuel for GIA's evolution. We review every submission.
            </p>
            <Link to="/">
              <Button variant="secondary" className="px-10 h-12 rounded-full">Back home</Button>
            </Link>
          </div>
        ) : (
          <div className="w-full">
            <h1 className="text-5xl font-bold mb-4 tracking-tight text-center">Shape the Future.</h1>
            <p className="text-white/40 text-center text-lg mb-12">
              Found a bug? Have a feature request? Let the Agency know.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-3">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-14 bg-[#303030] border border-white/10 rounded-2xl px-5 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-3">Your Feedback</label>
                <textarea 
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  minLength={10}
                  maxLength={5000}
                  className="w-full bg-[#303030] border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all resize-none placeholder:text-white/10"
                />
                <p className="text-[10px] text-white/20 mt-2">Minimum 10 characters, maximum 5000 characters</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}

              <Button variant="primary" className="w-full h-14 rounded-2xl font-bold text-base" disabled={loading || !email.trim() || !message.trim()}>
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Feedback;
