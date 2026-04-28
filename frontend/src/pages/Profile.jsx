import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Mail, Calendar, MapPin, Edit3 } from 'lucide-react';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);

  if (!user) return null;

  return (
    <div className="bg-dark-bg rounded-3xl p-6 md:p-8 min-h-[80vh] shadow-xl border border-white/5">
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white/90">My Profile</h1>
            <p className="text-gray-400 mt-1">Manage your account and personal details</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-dark-surface-hover rounded-lg transition-colors text-sm font-medium"
          >
            <Edit3 size={16} /> {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden relative border border-white/5">
          {/* Banner */}
          <div className="h-32 sm:h-48 bg-gradient-to-r from-primary-600/30 via-accent-500/20 to-dark-bg relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          </div>

          <div className="px-6 sm:px-10 pb-10 relative">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-20 mb-6">
              <div className="relative group">
                <div className="h-32 w-32 rounded-2xl bg-dark-bg border-4 border-dark-bg overflow-hidden flex items-center justify-center shadow-2xl relative z-10">
                  <div className="h-full w-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl font-bold text-white shadow-inner">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                {isEditing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-xs font-semibold rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    Upload Photo
                  </div>
                )}
              </div>
              <div className="pb-2">
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium uppercase tracking-wider">
                    {user.role} Module
                  </span>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin size={14} /> Remote
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-white/5 pb-2">About</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {user.role === 'student'
                      ? "Passionate software engineering student eager to bridge the gap between AI and real-world applications. Always learning, actively building, and looking for the next big challenge."
                      : "Experienced technical recruiter focusing on matching top-tier engineering talent with high-growth technology startups."}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-white/5 pb-2 text-white">Contact Information</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="p-2 bg-dark-surface rounded-md border border-white/5"><Mail size={16} className="text-gray-400" /></div>
                      {user.email}
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="p-2 bg-dark-surface rounded-md border border-white/5"><Calendar size={16} className="text-gray-400" /></div>
                      Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </li>
                  </ul>
                </div>
              </div>

              {user.role === 'hiring' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl border border-white/5 bg-dark-surface/40">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Recruitment Statistics</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1 text-gray-400">
                          <span>Job Posting Quota</span>
                          <span className="text-primary-400 font-medium">85%</span>
                        </div>
                        <div className="h-2 bg-dark-bg/50 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 w-[85%] rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1 text-gray-400">
                          <span>Active Candidates</span>
                          <span className="text-white font-medium">43</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
