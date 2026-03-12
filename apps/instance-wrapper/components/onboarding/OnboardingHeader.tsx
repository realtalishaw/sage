import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';

const OnboardingHeader: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0b0b0b]">
      <button 
        onClick={handleLogoClick}
        className="flex items-center justify-center w-10 h-10 bg-white rounded-xl hover:opacity-90 transition-opacity"
      >
        <span className="text-black font-black text-lg">G.</span>
      </button>
      
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        Log out
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
};

export default OnboardingHeader;
