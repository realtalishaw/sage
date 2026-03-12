
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import ForYouSection from '../components/ForYouSection';
import Footer from '../components/Footer';
import { supabase } from '../src/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { LogOut, LayoutDashboard } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('id', userId)
        .single();
      setProfileImageUrl(data?.profile_image_url ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfileImageUrl(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-8">
        <div className="max-w-[1040px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tighter">GIA</span>
          </div>
          <nav className="flex items-center">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full overflow-hidden border border-white/10 hover:border-white/20 transition-all"
                >
                  {profileImageUrl ? (
                    <img 
                      src={profileImageUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(user.email || 'U')}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate('/app/home'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        View Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/activate">
                <Button variant="primary" size="md" className="rounded-full px-6">Get started</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-screen pt-24">
        {/* Hero Section - Centered above arch space */}
        <section className="relative z-20 px-6 text-center max-w-[1100px] mx-auto flex flex-col justify-center items-center" style={{ minHeight: 'calc(100vh - 500px)' }}>
          <h1 className="text-[44px] md:text-[72px] font-[650] leading-[1.05] tracking-[-0.04em] mb-8 max-w-[900px]">
            Work that handles itself.
          </h1>
          <p className="text-[18px] md:text-[21px] text-white/50 leading-relaxed mb-10 max-w-[900px] mx-auto font-medium">
            GIA learns how you work and takes care of the rest. No asking, no waiting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? "/app/home" : "/activate"}>
              <Button variant="primary" size="md" className="rounded-full px-10">
                {user ? "Go to Dashboard" : "Try GIA"}
              </Button>
            </Link>
          </div>
        </section>

        {/* Arch Showcase Section */}
        <ForYouSection />
      </main>

      {/* Footer with consistent background */}
      <Footer />
    </>
  );
};

export default Landing;
