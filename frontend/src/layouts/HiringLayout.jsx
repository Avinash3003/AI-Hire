import React, { useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, PlusCircle, Briefcase, Settings, User } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const HiringLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menu = [
    { name: 'Dashboard', path: '/hiring-dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'My Jobs', path: '/hiring-jobs', icon: <Briefcase size={18} /> },
    { name: 'Create Job', path: '/hiring-jobs/create', icon: <PlusCircle size={18} /> },
    { name: 'My Profile', path: '/profile', icon: <User size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 flex flex-col md:flex-row font-sans selection:bg-primary-500/30">
      <div className="bg-glow"></div>
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-nav md:border-r border-white/5 md:min-h-screen flex flex-col sticky top-0 md:h-screen z-50">
        <div className="p-6 border-b border-white/5 flex items-center justify-between md:justify-start gap-4">
          <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              HR
            </div>
            <span className="hidden md:block">HireLink Admin</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto hidden md:block">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-2">Recruitment</p>
          {menu.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                location.pathname === item.path 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-surface'
              }`}
            >
              <span className={location.pathname === item.path ? 'text-blue-400' : 'text-gray-500'}>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 hidden md:block">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-gray-500">Hiring Manager</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-10 relative z-10 overflow-y-auto block h-screen">
        <Toaster position="top-right" toastOptions={{
          style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #27272a' }
        }}/>
        <Outlet />
      </main>
    </div>
  );
};

export default HiringLayout;
