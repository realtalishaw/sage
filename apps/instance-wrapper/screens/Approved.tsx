
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const Approved: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] p-10 bg-[#212121] border border-white/10 rounded-[22px] text-center">
        <h1 className="text-3xl font-bold mb-4">You’re in!</h1>
        <p className="text-sm text-white/40 mb-8">Thank you for your interest in GIA. Your application has been approved.</p>
        
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-8 text-left">
           <p className="text-[10px] uppercase font-bold text-white/20 mb-1">Approved Email</p>
           <p className="text-sm font-medium text-white/90">demo@gia.agency</p>
        </div>

        <Link to="/onboarding">
          <Button variant="primary" className="w-full mb-8">Try GIA</Button>
        </Link>

        <div className="pt-8 border-t border-white/5">
           <p className="text-xs text-white/40 mb-4 font-medium uppercase tracking-widest">Community</p>
           <p className="text-sm text-white/60 mb-6">We also invite you to join our Discord!</p>
           <Button variant="secondary" className="w-full">Join Discord</Button>
        </div>
      </div>
    </div>
  );
};

export default Approved;
