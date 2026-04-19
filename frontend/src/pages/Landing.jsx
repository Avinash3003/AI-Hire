import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, GraduationCap, Zap } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in relative">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-surface border border-dark-border mb-8 shadow-lg">
        <Zap size={14} className="text-primary-400" />
        <span className="text-sm font-medium text-gray-300">The next generation of AI Recruitment</span>
        <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-0.5 rounded-full ml-2">Beta</span>
      </div>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
        Connect Talent with <br className="hidden md:block" /> Opportunity using AI
      </h1>
      
      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
        Whether you're looking to hire top tier candidates or searching for your dream role, our intelligent platform streamlines the entire process.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        <button 
          onClick={() => navigate('/signup')} 
          className="group relative px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform flex items-center justify-center"></div>
          <span className="relative flex items-center justify-center gap-2">
            Get Started For Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
        <button 
          onClick={() => navigate('/login')} 
          className="px-8 py-4 bg-dark-surface hover:bg-dark-border text-white border border-dark-border rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
        >
          Sign In to Dashboard
        </button>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            <Briefcase className="text-blue-400" size={32} />
          </div>
          <h3 className="text-xl font-bold mb-3">For Hiring Managers</h3>
          <p className="text-gray-400 text-sm">Post jobs, review AI-scored applicant profiles, and streamline your recruitment pipeline effortlessly.</p>
        </div>
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-6">
            <GraduationCap className="text-primary-400" size={32} />
          </div>
          <h3 className="text-xl font-bold mb-3">For Students & Job Seekers</h3>
          <p className="text-gray-400 text-sm">Browse personalized job recommendations, track applications, and highlight your skills smartly.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
