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
                 <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-green-400">Action Required: Complete Assessment</p>
                      <p className="text-xs text-gray-400">Due: {new Date(app.assessment_links[0].expires_at).toLocaleDateString()}</p>
                    </div>
                    <a href={`/assessment/${app.assessment_links[0].token}`} target="_blank" rel="noreferrer" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg">
                       Start Exam
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
