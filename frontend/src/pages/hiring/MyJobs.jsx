import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableRow, TableCell } from '../../components/ui/Table';
import { Edit2, Trash2, Send, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Modal State
  const [inviteModalJob, setInviteModalJob] = useState(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/jobs/my');
      setJobs(data);
    } catch {
      toast.error('Failed to load your campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvites = async () => {
    if(!inviteEmails.trim()) return toast.error("Provide at least one email");
    
    // basic split
    const emails = inviteEmails.split(",").map(e => e.trim()).filter(e => e);
    
    setSendingInvites(true);
    try {
      await api.post('/invites/', { job_id: inviteModalJob.id, emails });
      toast.success(`Successfully dispatched ${emails.length} invites!`);
      setInviteEmails("");
      setInviteModalJob(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to dispatch invites");
    } finally {
      setSendingInvites(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Card noPadding>
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-surface/50">
          <div>
            <h3 className="text-xl font-bold text-white">Active Campaigns</h3>
            <p className="text-sm text-gray-400 mt-1">Manage recruiting campaigns and invite candidates</p>
          </div>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-gray-500 animate-pulse">Loading campaigns...</div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">No campaigns launched yet. Create a job to begin sending invites.</div>
        ) : (
          <Table headers={['Role', 'Configurations', 'Status', 'Candidates', 'Actions']}>
            {jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell>
                  <p className="font-bold text-white text-base">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{job.department}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {job.config_json.rounds?.interview?.enabled && <Badge variant="neutral">AI Video</Badge>}
                    {job.config_json.rounds?.coding?.enabled && <Badge variant="neutral">Code Judge</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={job.status === 'published' ? 'success' : 'warning'}>{job.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                     <span className="w-8 h-8 rounded-full border-2 border-dark-surface bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-bold z-10">+</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { window.location.href = `/hiring-jobs/${job.id}`; }} className="px-4 py-1.5 text-xs font-bold text-white bg-dark-bg hover:bg-primary-500/20 hover:text-primary-300 hover:border-primary-500/40 rounded-lg border border-white/10 transition-all flex items-center gap-1.5 shadow-sm">
                      View Applicants
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-white bg-transparent rounded border border-transparent hover:border-white/10 transition-colors"><Edit2 size={14} /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Invite Modal */}
      {inviteModalJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-dark-surface w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 relative">
            <button onClick={() => setInviteModalJob(null)} className="absolute top-4 right-4 p-2 bg-dark-bg hover:bg-white/10 rounded-full text-gray-400 transition-colors"><X size={16}/></button>
            <h2 className="text-xl font-bold text-white mb-1">Invite Candidates</h2>
            <p className="text-sm text-gray-400 mb-6">Dispatch secure assessment links for <strong className="text-white">{inviteModalJob.title}</strong></p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Candidate Email Addresses (comma separated)</label>
                <textarea 
                  rows={4} 
                  className="w-full bg-dark-bg/80 border border-white/10 hover:border-white/20 focus:border-primary-500 rounded-xl p-3 text-sm text-white outline-none transition-colors"
                  placeholder="alex@example.com, sara@domain.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                />
              </div>
              <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-xl">
                <p className="text-xs text-primary-300 leading-relaxed">
                  Candidates will receive an encrypted access link valid for 7 days. They must verify their email before uploading their resume and beginning the configured assessment rounds.
                </p>
              </div>
              <button disabled={sendingInvites} onClick={handleSendInvites} className="w-full btn-primary py-3 flex justify-center text-sm font-bold">
                {sendingInvites ? "Dispatching..." : "Send Invites"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobs;
