import React, { useContext, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Settings, ChevronDown, Sparkles } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // On auth pages show minimal chrome — no profile dropdown even if JWT exists
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const navItems = user ? [
    { label: 'Dashboard', path: `/${user.role}-dashboard`, icon: <LayoutDashboard size={16} /> },
    { label: 'My Profile', path: '/profile', icon: <User size={16} /> }
  ] : [];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 flex flex-col font-sans selection:bg-primary-500/30">
      {/* Background Orbs */}
      <div className="bg-glow"></div>
      <div className="bg-glow-2"></div>

      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="font-bold text-xl tracking-tight text-white flex items-center gap-2 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] transition-shadow">
              <Sparkles size={16} />
            </div>
            AI•HireLink
          </div>
          
          <div className="flex items-center gap-6">
            {user && !isAuthPage ? (
              <>
                <nav className="hidden md:flex items-center gap-1 bg-dark-surface/50 p-1 rounded-full border border-white/5 shadow-inner">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        location.pathname === item.path 
                          ? 'bg-dark-border text-white shadow-sm' 
                          : 'text-gray-400 hover:text-white hover:bg-dark-border/50'
                      }`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </nav>

                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 hover:bg-dark-surface p-1 pr-3 rounded-full border border-transparent hover:border-white/5 transition-all text-sm group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold shadow-inner border border-white/10 group-hover:border-white/20">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block font-medium text-gray-200">{user.name.split(' ')[0]}</span>
                    <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 glass-panel rounded-xl py-2 shadow-2xl origin-top-right animate-in fade-in zoom-in-95 duration-200 z-50">
                      <div className="px-4 py-3 border-b border-white/5 mb-2">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                        <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-primary-500/20 text-primary-300 uppercase tracking-wider border border-primary-500/20">
                          {user.role} Account
                        </div>
                      </div>
                      
                      <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-surface hover:text-white flex items-center gap-2 transition-colors">
                        <User size={16} /> My Profile
                      </button>
                      <button onClick={() => { setDropdownOpen(false); navigate(`/${user.role}-dashboard`); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-surface hover:text-white flex items-center gap-2 transition-colors">
                        <LayoutDashboard size={16} /> Dashboard
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-surface hover:text-white flex items-center gap-2 transition-colors cursor-not-allowed opacity-50">
                        <Settings size={16} /> Settings
                      </button>
                      
                      <div className="h-px bg-white/5 my-2"></div>
                      
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors">
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
               <div className="flex items-center gap-3">
                 <button onClick={() => navigate('/login')} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</button>
                 <button onClick={() => navigate('/signup')} className="text-sm font-medium btn-primary px-4 py-1.5">Sign up</button>
               </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10 block">
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#18181b', // dark-surface
            color: '#e4e4e7',
            border: '1px solid #27272a', // dark-border
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }
        }}/>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
