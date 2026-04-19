import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ArrowRight, Mail, Lock, GraduationCap, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already logged in, redirect immediately to the correct dashboard
  useEffect(() => {
    if (user) {
      navigate(user.role === 'student' ? '/jobs' : '/hiring-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await login(email, password);
      // Ensure role restriction if they logged into the wrong portal side (optional enhancement)
      if (user.role !== role && user.role) {
         toast.error(`Account belongs to a ${user.role}. Redirecting...`);
      } else {
         toast.success(`Welcome back, ${user.name}!`);
      }
      navigate(user.role === 'student' ? '/jobs' : '/hiring-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = role === 'student';

  return (
    <div className="min-h-[85vh] flex items-center justify-center animate-slide-up p-4">
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden transition-colors border-2 ${isStudent ? 'border-primary-500/20' : 'border-blue-500/20'}">
        
        {/* Glow effect */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isStudent ? 'via-primary-500' : 'via-blue-500'} to-transparent transition-colors`}></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm">{isStudent ? 'Access your Candidate Portal' : 'Access your ATS Engine'}</p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-dark-bg/80 border border-dark-border rounded-xl mb-6">
          <button type="button" onClick={() => setRole('student')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isStudent ? 'bg-primary-600 shadow-md shadow-primary-600/20 text-white' : 'text-gray-400 hover:text-white'}`}>
             <GraduationCap size={16}/> Candidate
          </button>
          <button type="button" onClick={() => setRole('hiring')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isStudent ? 'bg-blue-600 shadow-md shadow-blue-600/20 text-white' : 'text-gray-400 hover:text-white'}`}>
             <Briefcase size={16}/> Recruiter
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3.5 pl-12 pr-4 outline-none transition-colors text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`}
                placeholder={isStudent ? "Student Email" : "Corporate Email"}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3.5 pl-12 pr-4 outline-none transition-colors text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`}
                placeholder="Password"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 mt-2 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${isStudent ? 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
          >
            {loading ? <span className="animate-pulse">Authenticating...</span> : <>Secure Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          New to the platform? <Link to="/signup" className={`font-bold ml-1 transition-colors ${isStudent ? 'text-primary-400 hover:text-primary-300' : 'text-blue-400 hover:text-blue-300'}`}>Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
