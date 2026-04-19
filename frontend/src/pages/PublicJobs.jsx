import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, ChevronRight, X, User as UserIcon, Mail, Upload, Link as LinkIcon, Code } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PublicJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Application Form State
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', resume: null, linkedin: '', github: '' });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/jobs/public');
      setJobs(data);
    } catch {
      toast.error('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase());
    const matchesLoc = filterLocation === 'All' || j.config_json.work_mode === filterLocation;
    return matchesSearch && matchesLoc;
  });

  const handleApply = async (e) => {
    e.preventDefault();
    if (!formData.resume) {
        toast.error("Please upload your PDF resume.");
        return;
    }
    setApplying(true);
    try {
      const payload = new FormData();
      payload.append("job_id", selectedJob.id);
      payload.append("full_name", formData.full_name);
      payload.append("email", formData.email);
      payload.append("phone", formData.phone);
      payload.append("linkedin", formData.linkedin);
      payload.append("github", formData.github);
      payload.append("resume", formData.resume); // The raw File object

      await api.post('/applications/apply', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApplied(true);
      toast.success("Application successfully submitted!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="animate-fade-in relative max-w-5xl mx-auto space-y-12 pb-20">
      <div className="text-center pt-8 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Discover Your Next Role</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">Browse our open positions and join a team building the future.</p>
        
        <div className="relative max-w-2xl mx-auto group mt-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input 
              type="text" 
              placeholder="Search by job title, department, or keywords..."
              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-2xl py-4 pl-14 pr-6 text-slate-800 outline-none shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={filterLocation} onChange={e=>setFilterLocation(e.target.value)} className="w-full md:w-48 bg-white border border-slate-200 focus:border-blue-500 rounded-2xl py-4 px-6 text-slate-800 outline-none shadow-sm transition-all cursor-pointer">
            <option value="All">All Locations</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 pb-20">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredJobs.map(job => (
            <div key={job.id} onClick={() => { setSelectedJob(job); setApplied(false); setFormData({full_name:'', email:'', phone:'', resume:null, linkedin:'', github:''}); }} className="bg-white border border-slate-200 p-6 rounded-2xl cursor-pointer group hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase size={22} />
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md">{job.experience_level}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{job.title}</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">{job.department}</p>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-100/80">
                <div className="flex gap-4 text-xs text-slate-500 font-medium tracking-wide">
                  <span className="flex items-center gap-1.5"><MapPin size={14}/> {job.config_json.location}</span>
                  <span className="flex items-center gap-1.5 text-slate-400">• {job.config_json.work_mode}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><ChevronRight size={16}/></div>
              </div>
            </div>
          ))}
          {filteredJobs.length === 0 && <div className="col-span-2 text-center py-20 text-slate-400 font-medium">No active positions matching your criteria.</div>}
        </div>
      )}

      {/* Details/Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden relative">
            <button onClick={() => setSelectedJob(null)} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors z-10"><X size={20}/></button>
            
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Job Info Panel */}
              <div className="w-full md:w-1/2 p-6 sm:p-10 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md mb-4 inline-block">{selectedJob.department}</span>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{selectedJob.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 font-medium mb-8 border-b border-slate-100 pb-6">
                  <span className="flex items-center gap-1.5"><MapPin size={16}/> {selectedJob.config_json.location}</span>
                  <span className="flex items-center gap-1.5"><Briefcase size={16}/> {selectedJob.experience_level}</span>
                  <span className="px-2 py-0.5 border border-slate-200 rounded text-slate-500 bg-white">{selectedJob.config_json.work_mode}</span>
                  <div className="ml-auto flex items-center gap-2">
                     <button onClick={() => toast.success("Saved to your profile!")} className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors">Save for Later</button>
                     <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }} className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"><LinkIcon size={14}/> Share</button>
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">About the Role</h3>
                    <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedJob.description}</p>
                  </section>
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.config_json.must_have_skills?.map(s => <span key={s} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 shadow-sm">{s}</span>)}
                    </div>
                  </section>
                  {selectedJob.config_json.nice_to_have_skills?.length > 0 && (
                    <section>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Bonus Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.config_json.nice_to_have_skills.map(s => <span key={s} className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">{s}</span>)}
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Form Panel */}
              <div className="w-full md:w-1/2 p-6 sm:p-10 overflow-y-auto bg-white">
                {applied ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-2">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Application Received</h3>
                    <p className="text-slate-500 max-w-sm">Thank you for applying. Our recruiter algorithm will review your resume and we will contact you via email shortly.</p>
                    <button onClick={() => setSelectedJob(null)} className="mt-8 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Return to Jobs</button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Submit Application</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input required type="text" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all text-slate-800" value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} placeholder="John Doe"/>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input required type="email" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all text-slate-800" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} placeholder="you@domain.com"/>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Phone</label>
                        <input required type="tel" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-4 outline-none transition-all text-slate-800" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000"/>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Upload Resume (PDF)</label>
                      <div className="relative border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden group">
                        <Upload className="text-blue-400 group-hover:scale-110 transition-transform mb-2" size={28} />
                        <p className="text-sm text-slate-700 font-medium mb-1">
                          {formData.resume ? formData.resume.name : "Drag & Drop your resume here"}
                        </p>
                        <p className="text-xs text-slate-500">
                           {formData.resume ? `${(formData.resume.size / 1024 / 1024).toFixed(2)} MB` : "or click to select file"}
                        </p>
                        <input required type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>setFormData({...formData, resume: e.target.files[0]})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">LinkedIn <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <div className="relative flex items-center">
                          <LinkIcon className="absolute left-3 text-slate-400" size={16} />
                          <input type="url" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-all text-slate-800" value={formData.linkedin} onChange={e=>setFormData({...formData, linkedin: e.target.value})} placeholder="linkedin.com/in/..."/>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">GitHub <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <div className="relative flex items-center">
                          <Code className="absolute left-3 text-slate-400" size={16} />
                          <input type="url" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-all text-slate-800" value={formData.github} onChange={e=>setFormData({...formData, github: e.target.value})} placeholder="github.com/..."/>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button type="submit" disabled={applying} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                        {applying ? "Parsing Resume..." : "Submit Application"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicJobs;
