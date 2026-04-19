import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { MapPin, Briefcase, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const InviteLanding = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [resumeUrl, setResumeUrl] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    verifyInvite();
  }, [token]);

  const verifyInvite = async () => {
    try {
      const { data } = await api.get(`/invites/verify/${token}`);
      setInvite(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired invitation link.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if(!resumeUrl) return toast.error("Please supply a resume URL to proceed.");
    setApplying(true);
    try {
      // Actually we need to log the user in to submit the application if auth is still JWT-based globally.
      // For this phase, if the backend `applications/apply` requires JWT, the student must create an account first!
      // Let's implement an intercept flow: We log them out, take their email, register an explicit student account, then apply.
      // But wait! If this route `/invite/:token` bypasses auth to view, applying currently requires `current_user` in backend.
      // So we must instruct the user to login/register implicitly if they have no token in localStorage!
      
      const tokenExists = localStorage.getItem('token');
      if(!tokenExists) {
         toast.error("You must register or log in first to continue.", { duration: 4000 });
         // redirect to signup with reference
         navigate('/signup');
         return;
      }

      await api.post('/applications/apply', { job_id: invite.job_id, resume_url: resumeUrl, token: token });
      toast.success("Application uploaded successfully! Beginning verification...");
      
      // Mark invite as accepted locally to update UI
      setInvite({...invite, status: 'accepted'});
      navigate('/student-applications');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400 animate-pulse">Verifying secure link...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-8 rounded-2xl text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-red-400" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>{error}</p>
        <p className="text-sm text-red-400">Please request a new link from the hiring team.</p>
      </div>
    );
  }

  const job = invite.jobs;

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-white shadow flex items-center justify-center mx-auto mb-6">
           <Briefcase className="text-blue-600" size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">You've been invited!</h1>
        <p className="text-slate-500">The hiring team requests your application for a secure assessment round.</p>
      </div>

      {/* Job Card */}
      <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="border-b border-slate-100 pb-6 mb-6">
          <Badge variant="primary" className="mb-4">{job.department}</Badge>
          <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
          <div className="flex gap-4 mt-3 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><MapPin size={16}/> {job.config_json.location}</span>
            <span className="flex items-center gap-1.5"><Briefcase size={16}/> {job.experience_level}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
             <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Role Overview</h3>
             <p className="text-slate-700 leading-relaxed text-sm">{job.description}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Critical Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.config_json.must_have_skills?.map(s => <span key={s} className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">{s}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Application Box */}
      {invite.status === 'pending' ? (
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-2"><FileCheck size={20} className="text-blue-600"/> Upload Resume to Begin</h3>
          <p className="text-blue-700/80 text-sm mb-6 max-w-lg">
            Our AI screening system will extract key data points from your resume before you proceed to the next module. 
          </p>
          <div className="space-y-4 max-w-xl">
            <label className="text-sm font-semibold text-blue-900 block">Resume URL Link</label>
            <input 
              type="text"
              value={resumeUrl}
              onChange={e => setResumeUrl(e.target.value)}
              placeholder="e.g. drive.google.com/file/d/..."
              className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-700 shadow-sm outline-none transition-all"
            />
            <button 
              onClick={handleApply} 
              disabled={applying}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 font-bold rounded-xl transition-all"
            >
              {applying ? "Authorizing..." : "Submit & Start Assessment"}
            </button>
            <p className="text-xs text-center text-blue-600 mt-2">
              You must be logged in with email <strong>{invite.email}</strong> to proceed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center text-green-800">
           <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
           <h3 className="text-xl font-bold mb-1">Invite Accepted</h3>
           <p className="text-sm">You have successfully applied using this token. Refer to your dashboard for status.</p>
        </div>
      )}
    </div>
  );
};

// Quick stub for badge since light-mode needed slightly tweak
const Badge = ({children, className=""}) => (
  <span className={`inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-[10px] tracking-widest uppercase rounded-md ${className}`}>
    {children}
  </span>
);

export default InviteLanding;
