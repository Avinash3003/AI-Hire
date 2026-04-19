import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ArrowRight, Mail, Lock, User, GraduationCap, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState({ score: 0, label: '', color: 'bg-dark-border', text: '' });
  
  const { signup, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(user.role === 'student' ? '/jobs' : '/hiring-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const p = formData.password;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;

    if (p.length === 0) setStrength({ score: 0, label: '', color: 'bg-dark-border', text: '' });
    else if (score < 2) setStrength({ score: 1, label: 'Weak', color: 'bg-red-500', text: 'Add uppercase, lowercase, and numbers' });
    else if (score < 4) setStrength({ score: 2, label: 'Moderate', color: 'bg-yellow-500', text: 'Almost there, add missing character types' });
    else setStrength({ score: 3, label: 'Strong', color: 'bg-green-500', text: 'Strong password!' });
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      const user = await signup(formData.name, formData.email, formData.password, formData.role);
      toast.success(`Welcome to the platform, ${user.name}!`);
      navigate(user.role === 'student' ? '/jobs' : '/hiring-dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to sign up'));
    } finally {
      setLoading(false);
    }
  };

  const isStudent = formData.role === 'student';

  return (
    <div className="min-h-[85vh] flex items-center justify-center animate-slide-up p-4 py-12">
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden transition-colors border-2 ${isStudent ? 'border-primary-500/20' : 'border-blue-500/20'}">
        
        {/* Glow effect */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isStudent ? 'via-primary-500' : 'via-blue-500'} to-transparent transition-colors`}></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 text-white">Create Account</h1>
          <p className="text-gray-400 text-sm">{isStudent ? 'Join the Candidate ecosystem' : 'Join the Hiring Manager ATS'}</p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-dark-bg/80 border border-dark-border rounded-xl mb-6">
          <button type="button" onClick={() => setFormData({...formData, role: 'student'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isStudent ? 'bg-primary-600 shadow-md shadow-primary-600/20 text-white' : 'text-gray-400 hover:text-white'}`}>
             <GraduationCap size={16}/> Candidate
          </button>
          <button type="button" onClick={() => setFormData({...formData, role: 'hiring'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isStudent ? 'bg-blue-600 shadow-md shadow-blue-600/20 text-white' : 'text-gray-400 hover:text-white'}`}>
             <Briefcase size={16}/> Recruiter
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3 pl-11 pr-4 outline-none text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`} placeholder="Full Name" required/>
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3 pl-11 pr-4 outline-none text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`} placeholder={isStudent ? "Student Email" : "Corporate Email"} required/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="password" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3 pl-11 pr-3 outline-none text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`} placeholder="Password" required/>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="password" value={formData.confirmPassword} onChange={e=>setFormData({...formData, confirmPassword: e.target.value})} className={`w-full bg-dark-bg/60 border border-dark-border rounded-xl py-3 pl-11 pr-3 outline-none text-white text-sm focus:border-${isStudent ? 'primary' : 'blue'}-500`} placeholder="Confirm" required/>
            </div>
          </div>

          {formData.password && (
            <div className="space-y-1 py-1 px-1">
              <div className="flex gap-1 h-1.5 w-full">
                <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${strength.score >= 1 ? strength.color : 'bg-dark-border'}`}></div>
                <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${strength.score >= 2 ? strength.color : 'bg-dark-border'}`}></div>
                <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${strength.score >= 3 ? strength.color : 'bg-dark-border'}`}></div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 flex justify-between uppercase font-bold tracking-wider">
                <span>{strength.text}</span>
                <span className={`${strength.score === 1 ? 'text-red-400' : strength.score === 2 ? 'text-yellow-400' : 'text-green-400'}`}>{strength.label}</span>
              </p>
            </div>
          )}

          <button type="submit" disabled={loading} className={`w-full py-4 mt-2 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg text-sm tracking-wide ${isStudent ? 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'} flex items-center justify-center gap-2`}>
            {loading ? <span className="animate-pulse">Registering Data...</span> : <>Register via Secure Pipeline <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already signed up? <Link to="/login" className={`font-bold ml-1 transition-colors ${isStudent ? 'text-primary-400 hover:text-primary-300' : 'text-blue-400 hover:text-blue-300'}`}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
