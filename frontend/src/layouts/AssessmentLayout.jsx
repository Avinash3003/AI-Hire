import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const AssessmentLayout = () => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200 font-sans absolute inset-0 z-[100] overflow-hidden selection:bg-blue-500/30">
      <header className="h-14 border-b border-white/5 bg-slate-900 flex items-center justify-between px-6">
        <div className="font-bold text-lg text-white flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs">AI</div>
          Hire Platform
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
           <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Secure Environment</span>
        </div>
      </header>
      
      <main className="h-[calc(100vh-3.5rem)] relative w-full flex overflow-hidden">
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }
        }}/>
        <Outlet />
      </main>
    </div>
  );
};

export default AssessmentLayout;
