import React, { useState, useEffect } from 'react';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Compass, FileText, CheckCircle } from 'lucide-react';

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setApplications([]);
      setRecommendations([]);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Student Dashboard</h1>
        <p className="text-slate-500">Discover opportunities matching your skills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Recommended Jobs Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-800">AI Recommended Jobs</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : recommendations.length > 0 ? (
              recommendations.map((job, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                  <h3 className="font-bold text-slate-900">{job.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{job.company}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium border border-blue-100">{job.matchScore}% Match</span>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">View Details</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                <Compass className="text-slate-400 mb-3" size={32} />
                <h3 className="font-medium text-slate-700">No recommendations yet</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Complete your profile to let our AI find the best matches for you.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Applications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-800">Your Applications</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <>
                <CardSkeleton />
              </>
            ) : applications.length > 0 ? (
              applications.map((app, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{app.jobTitle}</h3>
                      <p className="text-sm text-slate-500 mt-1">{app.company}</p>
                    </div>
                    <span className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 font-medium text-slate-600">
                      <CheckCircle size={12} className="text-green-500" /> Applied
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                <FileText className="text-slate-400 mb-3" size={32} />
                <h3 className="font-medium text-slate-700">No applications</h3>
                <p className="text-sm text-slate-500 mt-2">
                  You haven't applied to any jobs yet.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default StudentDashboard;
