import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Briefcase, Clock, CheckCircle, XCircle, ExternalLink,
  FileText, AlertCircle, Trophy, ChevronRight
} from 'lucide-react';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS = {
  applied:     { label: 'Under Review',       color: 'bg-gray-100 text-gray-600',    icon: Clock },
  accepted:    { label: 'Exam Ready',          color: 'bg-blue-100 text-blue-700',    icon: ChevronRight },
  in_progress: { label: 'Exam In Progress',    color: 'bg-amber-100 text-amber-700',  icon: AlertCircle },
  evaluated:   { label: 'Exam Completed',      color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:    { label: 'Not Selected',        color: 'bg-red-100 text-red-600',      icon: XCircle },
  hired:       { label: '🎉 Hired!',           color: 'bg-emerald-100 text-emerald-700', icon: Trophy },
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || { label: status, color: 'bg-gray-100 text-gray-500', icon: Clock };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
      <Icon size={11}/> {s.label}
    </span>
  );
};

// ─── Application Card ─────────────────────────────────────────────────────────
const AppCard = ({ app }) => {
  const job    = app.jobs || {};
  const link   = app.assessment_links?.[0];
  const appliedDate = new Date(app.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Card Body */}
      <div className="p-5 flex items-start gap-4">
        {/* Company Initial */}
        <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-blue-600 text-lg">
          {(job.company_name || 'H').charAt(0).toUpperCase()}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{job.title || 'Role'}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{job.company_name} · {job.department}</p>
            </div>
            <StatusBadge status={app.status}/>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock size={10}/> Applied {appliedDate}</span>
            {job.experience_level && <span className="flex items-center gap-1"><Briefcase size={10}/> {job.experience_level}</span>}
            {app.resume_url && (
              <a href={app.resume_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors">
                <FileText size={10}/> Resume
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {app.status === 'accepted' && link?.status === 'pending' && (
        <div className="border-t border-blue-50 bg-blue-50/60 px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-800">Your exam is ready</p>
            {link.expires_at && (
              <p className="text-[10px] text-blue-400 mt-0.5">
                Expires {new Date(link.expires_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <button
            onClick={() => window.open(`/assessment/${link.token}`, '_blank')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-200"
          >
            Start Exam <ExternalLink size={11}/>
          </button>
        </div>
      )}

      {app.status === 'in_progress' && link && (
        <div className="border-t border-amber-50 bg-amber-50/60 px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block"/>
            Exam session is active
          </p>
          <a href={`/assessment/${link.token}`} target="_blank" rel="noreferrer"
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl transition-all">
            Re-enter <ExternalLink size={11}/>
          </a>
        </div>
      )}

      {(app.status === 'evaluated' || (app.status === 'accepted' && link?.status === 'completed')) && (
        <div className="border-t border-green-50 bg-green-50/60 px-5 py-2.5">
          <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
            <CheckCircle size={11}/> Assessment submitted — awaiting recruiter review
          </p>
        </div>
      )}

      {app.status === 'rejected' && (
        <div className="border-t border-red-50 bg-red-50/40 px-5 py-2.5">
          <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
            <XCircle size={11}/> Application not selected for this role
          </p>
        </div>
      )}

      {app.status === 'hired' && (
        <div className="border-t border-emerald-50 bg-emerald-50/60 px-5 py-2.5">
          <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
            <Trophy size={11}/> Congratulations! You have been hired. Check your email for next steps.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudentApplications = () => {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/applications/my');
        setApps(data);
      } catch {
        toast.error('Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filters = [
    { key: 'all',       label: 'All' },
    { key: 'applied',   label: 'Under Review' },
    { key: 'accepted',  label: 'Exam Ready' },
    { key: 'completed', label: 'Completed' },
    { key: 'hired',     label: 'Hired' },
    { key: 'rejected',  label: 'Rejected' },
  ];

  // Determine effective display status, taking assessment_link into account
  const isCompleted = (a) =>
    a.status === 'evaluated' || (a.status === 'accepted' && a.assessment_links?.[0]?.status === 'completed');
  const isExamReady = (a) =>
    a.status === 'accepted' && a.assessment_links?.[0]?.status === 'pending';

  const getCount = (key) => {
    if (key === 'all') return apps.length;
    if (key === 'completed') return apps.filter(isCompleted).length;
    if (key === 'accepted')  return apps.filter(isExamReady).length;
    return apps.filter(a => a.status === key).length;
  };

  const filtered = (() => {
    if (filter === 'all')       return apps;
    if (filter === 'completed') return apps.filter(isCompleted);
    if (filter === 'accepted')  return apps.filter(isExamReady);
    return apps.filter(a => a.status === filter);
  })();

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">My Applications</h1>
        <p className="text-gray-400 text-sm mt-1">Track your job applications and assessment status.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {filters.map(f => {
          const count = getCount(f.key);
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/15 hover:text-white hover:border-white/25'
              }`}>
              {f.label}
              {count > 0 && <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
              }`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
          <Briefcase size={36} className="mx-auto text-gray-600 mb-3"/>
          <p className="font-semibold text-gray-400">
            {filter === 'all' ? "You haven't applied to any jobs yet." : `No applications with status "${filters.find(f=>f.key===filter)?.label}".`}
          </p>
          {filter === 'all' && <p className="text-sm text-gray-600 mt-1">Visit the Job Board to find opportunities.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => <AppCard key={app.id} app={app}/>)}
        </div>
      )}
    </div>
  );
};

export default StudentApplications;
