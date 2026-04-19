import React, { useContext } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { Briefcase, LogOut, User, Menu } from 'lucide-react';

const StudentLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20 selection:text-blue-900">
      {/* Navbar segment */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/jobs')}>
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
               <Briefcase size={18}/>
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900">AIHire Portal</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/jobs" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Discover Jobs</Link>
            
            {user ? (
               <>
                 <Link to="/student-applications" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">My Applications</Link>
                 <div className="h-6 w-px bg-slate-200"></div>
                 <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-slate-800">{user.name}</span>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"><LogOut size={18}/></button>
                 </div>
               </>
            ) : (
               <>
                 <Link to="/login" className="text-sm font-bold text-blue-600 shadow-sm border border-blue-200 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Sign In</Link>
               </>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative">
        <Toaster position="top-center" toastOptions={{
          style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
        }}/>
        <Outlet />
      </main>
      
      <footer className="text-center py-8 text-slate-400 text-sm mt-auto border-t border-slate-200 bg-white">
        <p>Secured by AIHire Assessment Platform</p>
      </footer>
    </div>
  );
};

export default StudentLayout;
