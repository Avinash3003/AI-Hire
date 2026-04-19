import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Briefcase, MapPin, Clock, Users, DollarSign,
  ChevronRight, Activity, FileText, CheckCircle, Edit3
} from 'lucide-react';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState({ total: 0, new: 0, shortlisted: 0, evaluated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/applications/job/${jobId}`)
      ]);
      setJob(jobRes.data);

      const apps = appsRes.data || [];
      setStats({
        total: apps.length,
        new: apps.filter(a => a.status === 'applied').length,
        shortlisted: apps.filter(a => a.status === 'accepted').length,
        evaluated: apps.filter(a => a.status === 'evaluated').length,
      });
    } catch (err) {
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 bg-dark-surface rounded-xl"></div>
      <div className="h-48 bg-dark-surface rounded-2xl"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-dark-surface rounded-xl"></div>)}
      </div>
    </div>
  );

  if (!job) return (
    <div className="text-center py-24 text-gray-400">Job not found.</div>
  );

  return (
    <div className="animate-fade-in space-y-6 pb-12 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hiring-dashboard')} className="p-2 bg-dark-surface hover:bg-dark-border rounded-xl text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{job.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{job.company_name} &bull; {job.department}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${job.status === 'published' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
          {job.status}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applicants', value: stats.total, color: 'blue' },
          { label: 'Awaiting Review', value: stats.new, color: 'yellow' },
          { label: 'Shortlisted', value: stats.shortlisted, color: 'primary' },
          { label: 'Exam Completed', value: stats.evaluated, color: 'green' },
        ].map(s => (
          <div key={s.label} className={`glass-panel p-4 rounded-xl border border-${s.color}-500/20`}>
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-extrabold text-${s.color}-400`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Job Info Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">Position Details</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { icon: <MapPin size={15}/>, label: 'Location', value: job.location || 'Not specified' },
            { icon: <Briefcase size={15}/>, label: 'Experience', value: job.experience_level || 'Not specified' },
            { icon: <Users size={15}/>, label: 'Openings', value: `${job.openings || 1} position(s)` },
            { icon: <Clock size={15}/>, label: 'Job Type', value: job.job_type || 'Full-time' },
            { icon: <DollarSign size={15}/>, label: 'Salary', value: job.salary_range || 'Competitive' },
            { icon: <FileText size={15}/>, label: 'Posted', value: new Date(job.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2 p-3 bg-dark-bg/40 rounded-lg border border-white/5">
              <span className="text-gray-500 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{item.label}</p>
                <p className="text-gray-200 font-medium mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Required Skills */}
        {job.skills_required?.length > 0 && (
          <div>
            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {job.skills_required.map(skill => (
                <span key={skill} className="px-3 py-1 text-xs font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/20 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div>
            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-2">Job Description</p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(`/hiring-jobs/${jobId}/review`)}
          className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Users size={18} /> View Applicant Pipeline
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => navigate(`/hiring-jobs/${jobId}/assessment-builder`)}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Activity size={18} /> Configure AI Exam
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default JobDetails;
