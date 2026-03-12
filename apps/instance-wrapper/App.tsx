import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { User } from './types';
import { Icons } from './constants';
import { supabase } from '@/src/integrations/supabase/client';
import { clearApiToken } from './services/authToken';

// Pages
import Login from './screens/Login';
import Home from './screens/Home';
import Files from './screens/Files';
import FileViewPage from './screens/FileViewPage';
import Apps from './screens/Apps';
import Agents from './screens/Agents';
import AgentProfile from './screens/AgentProfile';
import AppDetailPage from './screens/AppDetailPage';
import Settings from './screens/Settings';


const App: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      const saved = localStorage.getItem('gia_user');
      if (saved) {
        try {
          const savedUser = JSON.parse(saved);

          // Fetch fresh admin status from Supabase
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', authData.user.id)
                .single();

              if (profile) {
                savedUser.isAdmin = !!profile.is_admin;
                localStorage.setItem('gia_user', JSON.stringify(savedUser));
              }
            }
          } catch (error) {
            console.error('Error fetching admin status on load:', error);
          }

          setUser(savedUser);
        } catch (e) {
          console.error("Failed to parse saved user", e);
        }
      }
      setIsLoadingUser(false);
    };

    loadUser();
  }, []);

  const handleLogin = async (email: string) => {
    const saved = localStorage.getItem('gia_user');
    let wasOnboarded = false;
    let isAdmin = false;

    if (saved) {
      try {
        const existing = JSON.parse(saved);
        if (existing.email === email) {
          wasOnboarded = !!existing.onboarded;
          isAdmin = !!existing.isAdmin;
        }
      } catch (e) { }
    }

    // Fetch admin status from Supabase
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          isAdmin = !!profile.is_admin;
        }
      }
    } catch (error) {
      console.error('Error fetching admin status:', error);
    }

    const newUser = { email, isLoggedIn: true, onboarded: wasOnboarded, isAdmin };
    setUser(newUser);
    localStorage.setItem('gia_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gia_user');
    clearApiToken();
  };

  const handleSetOnboarded = () => {
    if (user) {
      const updatedUser = { ...user, onboarded: true };
      setUser(updatedUser);
      localStorage.setItem('gia_user', JSON.stringify(updatedUser));
    }
  };

  // Show loading screen while user state is being initialized
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0b0b0b] text-[rgba(255,255,255,0.92)] selection:bg-white/20">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/app/home" replace /> : <Login onLogin={(email) => handleLogin(email)} />}
          />

          <Route
            path="/app/*"
            element={
              user ? <AppLayout onLogout={handleLogout} user={user} /> : <Navigate to="/login" replace />
            }
          >
            <Route path="home" element={<Home />} />
            <Route path="files" element={<Files />} />
            <Route path="files/:fileId" element={<FileViewPage />} />
            <Route path="apps" element={<Apps />} />
            <Route path="apps/:appId" element={<AppDetailPage />} />
            <Route path="agents" element={<Agents />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const AppLayout: React.FC<{ onLogout: () => void, user: User | null }> = ({ onLogout, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = React.useState<{
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  }>({
    firstName: '',
    lastName: '',
    profileImageUrl: null
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user?.email) return;
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_image_url')
          .eq('id', authUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }

        setProfileData({
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          profileImageUrl: profile?.profile_image_url || null
        });
      }
    };
    loadProfile();
  }, [user]);

  const navItems = [
    { icon: <Icons.Home />, label: 'Home', path: '/app/home' },
    { icon: <Icons.Files />, label: 'Files', path: '/app/files' },
    { icon: <Icons.Apps />, label: 'Apps', path: '/app/apps' },
    { icon: <Icons.Agents />, label: 'Agents', path: '/app/agents' },
    { icon: <Icons.Settings />, label: 'Settings', path: '/app/settings' },
  ];

  const handleSignOut = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b0b]">
      <aside className="group fixed top-0 left-0 bottom-0 w-[68px] hover:w-[240px] flex flex-col items-center bg-[#0b0b0b] transition-all duration-300 ease-in-out z-[60] py-6">
        <div className="flex-1 flex flex-col justify-center w-full px-3 gap-2">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center h-10 px-0 rounded-xl transition-all relative overflow-hidden w-full ${location.pathname.startsWith(item.path)
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className="shrink-0 w-[44px] h-10 flex items-center justify-center mx-auto group-hover:mx-0">
                  {item.icon}
                </div>
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pl-2 translate-x-[-10px] group-hover:translate-x-0">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="w-full mt-auto px-3 pb-6 flex flex-col gap-4">
          <div className="w-full">
            <div className="flex items-start gap-3 px-2">
              <div className="shrink-0 w-[44px] flex items-center justify-center mx-auto group-hover:mx-0">
                {profileData.profileImageUrl ? (
                  <img
                    src={profileData.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                    <UserRound size={16} className="text-white/60" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                <div className="text-sm font-medium text-white/90 text-left">
                  {profileData.firstName || profileData.lastName ? (
                    `${profileData.firstName} ${profileData.lastName}`.trim()
                  ) : (
                    user?.email || 'User'
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-red-500/80 hover:text-red-500 transition-colors mt-0.5 text-left block"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-[68px] p-6 md:p-8 overflow-y-auto">
        <Routes>
          <Route path="home" element={<Home />} />
          <Route path="files" element={<Files />} />
          <Route path="files/:fileId" element={<FileViewPage />} />
            <Route path="apps" element={<Apps />} />
            <Route path="apps/:appId" element={<AppDetailPage />} />
            <Route path="agents" element={<Agents />} />
            <Route path="agents/:agentId" element={<AgentProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
