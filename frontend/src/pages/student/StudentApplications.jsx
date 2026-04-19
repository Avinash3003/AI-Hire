import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const StudentApplications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const { data } = await api.get('/applications/my');
      setApps(data);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied': return <Badge variant="neutral">Under Review</Badge>;
      case 'interviewing': return <Badge variant="primary">Interviewing</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'hired': return <Badge variant="success">Hired!</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
      <p className="text-gray-400 mb-8">Track the status of your sent resumes.</p>
      
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 glass-panel rounded-xl animate-pulse"></div>)}
        </div>
      ) : apps.length === 0 ? (
        <Card className="text-center py-20">
          <p className="text-gray-400">You haven't applied to any jobs yet. Go to the Job Board!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {apps.map(app => (
            <Card key={app.id} className="hover:-translate-y-1 transition-transform">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Application ID: {app.id.split('-')[0]}
                  </h3>
                  <a href={app.resume_url} target="_blank" rel="noreferrer" className="text-sm text-primary-400 hover:underline mt-2 inline-block">View attached resume</a>
                </div>
                <div className="text-right">
                  {getStatusBadge(app.status)}
                </div>
              </div>
              
              {/* Assessment Link Render Block */}
              {app.assessment_links && app.assessment_links.length > 0 && app.assessment_links[0].status === 'pending' && (
                 <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-green-400 mb-1">🎉 Congratulations on your shortlisting!</h4>
                      <p className="text-sm text-gray-400 max-w-sm">You have been invited to the next rounds. This secure assessment involves proctoring constraints. Ensure you are in a quiet environment.</p>
                      <p className="text-xs font-mono text-red-400 mt-2">Expires: {new Date(app.assessment_links[0].expires_at).toLocaleString()}</p>
                    </div>
                    <a href={`/assessment/${app.assessment_links[0].token}`} target="_blank" rel="noreferrer" className="shrink-0 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-600/20 whitespace-nowrap">
                       Start Secure Assessment
                    </a>
                 </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentApplications;
