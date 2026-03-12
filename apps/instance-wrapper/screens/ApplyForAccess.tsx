
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '@/src/integrations/supabase/client';
import { sendAccessRequestEmail } from '../services/accessRequest';

const ApplyForAccess: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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

      // Check rate limit first
      const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc(
        'check_rate_limit',
        { p_ip_address: ipAddress }
      );

      if (rateLimitError) throw rateLimitError;

      if (!rateLimitOk) {
        setError('Too many requests from your location. Please try again later.');
        setLoading(false);
        return;
      }

      // Submit the access request
      const { error: insertError } = await supabase
        .from('access_requests')
        .insert([
          {
            email,
            message,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        ]);

      if (insertError) throw insertError;

      // Send confirmation email (don't fail submission if email fails)
      try {
        await sendAccessRequestEmail(email.trim());
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Continue anyway - email failure shouldn't block submission
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] p-10 bg-[#212121] border border-white/10 rounded-[22px] text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Request received</h1>
          <p className="text-sm text-white/40 mb-10">We've received your application. Our team reviews entries weekly and will send you an invite code soon.</p>
          <Link to="/">
            <Button variant="secondary" className="w-full">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
              G.
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Request an invitation to GIA</h1>
          <p className="text-sm text-white/40">Tell us how you plan on using GIA. We'll send you an invite code shortly.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">How can GIA help you?</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please tell us how you plan on using GIA. The more details you provide, the better we can tailor our solution to your needs."
              className="w-full bg-[#303030] border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all resize-none"
            />
            <p className="text-[10px] text-white/20 mt-2">The more detail you share, the better we can tailor your experience.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <Button variant="primary" className="w-full h-11" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit request'}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            Already have a code? <Link to="/activate" className="text-white hover:underline">Activate</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApplyForAccess;
