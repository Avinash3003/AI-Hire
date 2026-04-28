import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Plus, Users, Search, Briefcase, ChevronRight, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const HiringDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total_applicants: 0, active_jobs: 0, shortlisted: 0 });
  
  // Ported 2-Step Delete Modal
  const [deleteModalJob, setDeleteModalJob] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        api.get('/jobs/my'),
        api.get('/applications/hiring/stats')
      ]);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async () => {
      if (deleteConfirmText !== "DELETE") {
          return toast.error("You must type DELETE to confirm");
      }
      setIsDeleting(true);
      try {
          await api.delete(`/jobs/${deleteModalJob.id}`);
          toast.success("Job and all associated data successfully deleted.");
          setDeleteModalJob(null);
          setDeleteConfirmText("");
          fetchData();
      } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to delete job");
      } finally {
          setIsDeleting(false);
      }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hiring Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your job postings and applicants</p>
        </div>
        <button onClick={() => navigate('/hiring-jobs/create')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Plus size={18} /> Create Job
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-blue-500/20">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Briefcase size={24} /></div>
          <div>
            <p className="text-sm text-gray-400">Total Active Jobs</p>
            <p className="text-2xl font-bold text-white">{stats.active_jobs}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-primary-500/20">
          <div className="p-3 bg-primary-500/10 text-primary-400 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-400">Total Applications</p>
            <p className="text-2xl font-bold text-white">{stats.total_applicants}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-purple-500/20">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg"><Search size={24} /></div>
          <div>
            <p className="text-sm text-gray-400">New (Awaiting Review)</p>
            <p className="text-2xl font-bold text-white">{stats.new_applicants || 0}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-green-500/20">
          <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-400">Shortlisted</p>
            <p className="text-2xl font-bold text-white">{stats.shortlisted}</p>
          </div>
        </div>
      </div>



      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Job Postings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : jobs.length > 0 ? (
            jobs.map((job, idx) => (
              <div key={job.id} onClick={() => navigate(`/hiring-jobs/${job.id}`)} className="glass-panel p-6 rounded-xl overflow-hidden group cursor-pointer hover:border-primary-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">{job.title}</h3>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteModalJob(job); setDeleteConfirmText(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors z-10 relative"><Trash2 size={16}/></button>
                </div>
                <p className="text-sm text-gray-400 mt-1">{job.department} • {job.experience_level}</p>
                <p className="text-xs text-primary-400 font-bold mt-2">{job.salary || 'Competitive'}</p>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                   <span className="bg-white/5 px-2 py-1 rounded text-gray-300">{job.openings} Openings</span>
                   <span className={`px-2 py-1 rounded font-bold ${job.status === 'published' ? 'bg-primary-500/10 text-primary-400' : 'bg-gray-500/10 text-gray-400'}`}>{job.status.toUpperCase()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full border-2 border-dashed border-dark-border rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-dark-surface rounded-full flex items-center justify-center mb-4 border border-dark-border">
                <Briefcase className="text-gray-500" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-200">No jobs posted yet</h3>
              <p className="text-sm text-gray-400 max-w-sm mt-2 mb-6">
                Get started by creating your first job posting to attract top talent.
              </p>
              <button onClick={() => navigate('/hiring-jobs/create')} className="px-4 py-2 bg-dark-surface hover:bg-dark-border border border-dark-border text-white rounded-lg font-medium transition-colors">
                Create First Job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2-Step Delete Modal */}
      {deleteModalJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
           <div className="bg-dark-surface w-full max-w-md rounded-2xl border border-red-500/30 shadow-[-10px_0_100px_rgba(239,68,68,0.15)] p-6 relative">
              <button disabled={isDeleting} onClick={() => setDeleteModalJob(null)} className="absolute top-4 right-4 p-2 bg-dark-bg hover:bg-white/10 rounded-full text-gray-400 transition-colors"><X size={16}/></button>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] text-red-500 mb-4">
                  <Trash2 size={24}/>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Campaign?</h2>
              <p className="text-sm text-gray-400 mb-6">
                 Warning: This action is massive and irreversible. Deleting <strong className="text-white">{deleteModalJob.title}</strong> will instantly purge all candidates, tests, databases, and evaluations linked to this role.
              </p>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-sm font-bold text-gray-300 block mb-3">Type <span className="text-red-500 mx-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded font-mono select-all">DELETE</span> to unlock.</label>
                      <input 
                         type="text"
                         className="w-full bg-dark-bg/80 border border-red-500/20 focus:border-red-500 rounded-xl p-3 text-sm text-white font-mono placeholder:text-red-900/40 outline-none transition-colors"
                         placeholder="DELETE"
                         value={deleteConfirmText}
                         onChange={e => setDeleteConfirmText(e.target.value)}
                      />
                  </div>
                  <button disabled={isDeleting || deleteConfirmText !== 'DELETE'} onClick={handleDeleteJob} className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl flex justify-center text-sm font-bold shadow-xl transition-all uppercase tracking-widest mt-2 active:scale-95">
                      {isDeleting ? "Purging Engine..." : "Confirm Annihilation"}
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default HiringDashboard;
