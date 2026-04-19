import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FileText, CheckCircle, XCircle, Mail, ArrowLeft, ExternalLink, Activity, Search, Filter, MoreHorizontal, PauseCircle } from 'lucide-react';

const ApplicantReview = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [minScore, setMinScore] = useState(0);

  // Selection
  const [selectedApps, setSelectedApps] = useState(new Set());

  useEffect(() => {
    fetchApplications();
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      const { data } = await api.get(`/applications/job/${jobId}`);
      setApps(data);
    } catch {
      toast.error("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (appId, action) => {
    try {
      if(action === 'accept') {
          await api.post(`/applications/${appId}/accept`);
          toast.success("Candidate Accepted! Secure assessment URL generated.");
      } else if(action === 'reject') {
          await api.post(`/applications/${appId}/reject`);
          toast.success("Candidate Rejected.");
      } else if (action === 'hold') {
          // Future implement hold endpoint, for now simulate
          toast.success("Candidate placed on internal Hold.");
      }
      
      const newStatus = action === 'hold' ? 'hold' : (action === 'accept' ? 'accepted' : 'rejected');
      setApps(apps.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    } catch(err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedApps.size === 0) return;
    const loadingToast = toast.loading(`Processing bulk ${action}...`);
    try {
      // For simplicity in UI dev, fire them sequentially
      for (const id of selectedApps) {
         if (action === 'accept') await api.post(`/applications/${id}/accept`);
         if (action === 'reject') await api.post(`/applications/${id}/reject`);
      }
      toast.success(`Bulk ${action} successful!`, { id: loadingToast });
      fetchApplications();
      setSelectedApps(new Set());
    } catch (e) {
      toast.error("Bulk action partially failed", { id: loadingToast });
    }
  };

  const toggleSelectAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApps.map(a => a.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedApps);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedApps(newSet);
  };

  // Filter Logic
  const filteredApps = apps.filter(app => {
    const matchesSearch = app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesScore = app.ai_score >= minScore;
    return matchesSearch && matchesStatus && matchesScore;
  });

  return (
    <div className="animate-fade-in space-y-6 pb-12 w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pt-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hiring-jobs')} className="p-2 bg-dark-surface hover:bg-dark-border rounded-xl text-gray-400 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">Applicant Pipeline <Badge variant="primary">{apps.length} Total</Badge></h1>
            <p className="text-sm text-gray-400">Manage candidates, analyze metrics, and assign bulk actions.</p>
          </div>
        </div>
        <button onClick={() => navigate(`/hiring-jobs/${jobId}/assessment-builder`)} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2">
           <Activity size={18}/> Configure AI Exam
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-dark-surface/50 border border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
             <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} type="text" placeholder="Search name or email..." className="w-full bg-dark-bg/60 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 transition-colors text-white"/>
           </div>
           
           <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-dark-bg/60 border border-white/10 rounded-lg py-2 px-3 text-sm outline-none focus:border-primary-500 text-white min-w-[140px]">
             <option value="all">All Statuses</option>
             <option value="applied">Awaiting Review</option>
             <option value="accepted">Shortlisted</option>
             <option value="rejected">Rejected</option>
           </select>

           <div className="flex items-center gap-2 px-2 border border-white/10 bg-dark-bg/60 rounded-lg">
             <Filter size={14} className="text-gray-400"/>
             <span className="text-xs text-gray-400">Min Score:</span>
             <input type="range" min="0" max="100" value={minScore} onChange={e=>setMinScore(parseInt(e.target.value))} className="w-24 h-1 accent-primary-500 bg-dark-surface rounded-lg"/>
             <span className="text-xs font-bold text-primary-400 w-6">{minScore}</span>
           </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-none border-white/5 pt-4 lg:pt-0">
           <span className="text-sm text-gray-400 font-medium">{selectedApps.size} Selected</span>
           <button onClick={() => handleBulkAction('reject')} disabled={selectedApps.size===0} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${selectedApps.size > 0 ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-dark-bg text-gray-600 border border-dark-border cursor-not-allowed'}`}>
             Reject Selected
           </button>
           <button onClick={() => handleBulkAction('accept')} disabled={selectedApps.size===0} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-colors flex items-center gap-1.5 ${selectedApps.size > 0 ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg' : 'bg-dark-bg text-gray-600 border border-dark-border cursor-not-allowed'}`}>
             <CheckCircle size={14}/> Accept Selected
           </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-dark-bg/60 border border-white/5 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : apps.length === 0 ? (
        <Card className="text-center py-24 text-gray-500">No applications matching criteria.</Card>
      ) : (
        <div className="bg-dark-surface/40 border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-dark-bg/60 border-b border-white/5 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" checked={filteredApps.length > 0 && selectedApps.size === filteredApps.length} onChange={toggleSelectAll} className="w-4 h-4 accent-primary-500 cursor-pointer rounded bg-dark-bg border-white/10"/>
                </th>
                <th className="p-4">Candidate</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4 w-[120px]">AI Score</th>
                <th className="p-4 w-[300px]">Skill Report</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.map(app => (
                <tr key={app.id} className={`hover:bg-white/[0.02] transition-colors ${selectedApps.has(app.id) ? 'bg-primary-500/5' : ''}`}>
                  <td className="p-4 text-center">
                     <input type="checkbox" checked={selectedApps.has(app.id)} onChange={() => toggleSelect(app.id)} className="w-4 h-4 accent-primary-500 cursor-pointer rounded bg-dark-bg border-white/10"/>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                         {app.full_name.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-white mb-0.5">{app.full_name}</h4>
                         <p className="text-[11px] text-gray-400 flex items-center gap-1"><Mail size={10}/> {app.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-300">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="w-full bg-dark-bg rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${app.ai_score}%` }}></div>
                       </div>
                       <span className={`text-xs font-bold ${app.ai_score >= 75 ? 'text-green-400' : 'text-primary-400'}`}>{app.ai_score}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">{app.ai_recommendation}</p>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-wrap gap-1 mb-1.5">
                        {app.ai_strengths?.slice(0,3).map(s => <span key={s} className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px] whitespace-nowrap">{s}</span>)}
                        {app.ai_missing?.slice(0,2).map(s => <span key={s} className="px-1.5 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded text-[10px] whitespace-nowrap">{s}</span>)}
                     </div>
                     {app.status === 'evaluated' && app.assessment_links?.[0] && (
                        <div className="flex gap-2 mt-1">
                           <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[10px] font-bold">Tech: {app.assessment_links[0].coding_results?.[0]?.efficiency_score || 0}%</span>
                           <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold">Comm: {app.assessment_links[0].interview_results?.[0]?.communication_score || 0}%</span>
                        </div>
                     )}
                  </td>
                  <td className="p-4">
                    {app.status === 'applied' ? <Badge variant="warning">Awaiting Review</Badge> 
                     : app.status === 'accepted' ? <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border border-blue-500/20">Exam Link Sent</Badge>
                     : app.status === 'evaluated' ? <Badge variant="success" className="bg-green-500/10 text-green-400 border border-green-500/20 border font-bold">Exam Complete</Badge>
                     : app.status === 'hold' ? <Badge variant="neutral">On Hold</Badge>
                     : <Badge variant="danger">Rejected</Badge>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <a href={app.resume_url} target="_blank" rel="noreferrer" title="View Resume" className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><FileText size={16}/></a>
                      
                      {app.status === 'applied' && (
                        <>
                          <button onClick={() => handleAction(app.id, 'reject')} title="Reject" className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle size={16}/></button>
                          <button onClick={() => handleAction(app.id, 'hold')} title="Hold" className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"><PauseCircle size={16}/></button>
                          <button onClick={() => handleAction(app.id, 'accept')} title="Accept" className="p-1.5 text-primary-400 hover:text-white hover:bg-primary-500 rounded-lg transition-all shadow-sm"><CheckCircle size={16}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApplicantReview;
