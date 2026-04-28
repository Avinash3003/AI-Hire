import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { TagInput } from '../../components/ui/TagInput';
import { Settings, FileText, CheckCircle, ArrowRight, MapPin, Code, Video, Eye, Briefcase as BriefcaseIcon, DollarSign, ShieldCheck } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CreateJob = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '', 
    company_name: '', 
    department: '', 
    description: '',
    experience_level: 'Entry Level', 
    openings: 1,
    salary: '',
    skills_required: [], 
    status: 'published',
    config_json: {
      location: '', 
      work_mode: 'Remote',
      must_have_skills: [], 
      nice_to_have_skills: [],
      rounds: {
        resume: { threshold: 75 },
        interview: { enabled: true, questions: 3, difficulty: 'Medium', think_time: 30, answer_time: 120, edit_time: 30 },
        coding: { enabled: true, questions: 2, difficulty: 'Medium', total_time: 60, topics: [] },
        proctoring: { warning_limit: 3, scan_interval: 10 }
      }
    }
  });

  const setConfig = (key, value) => setFormData(prev => ({...prev, config_json: {...prev.config_json, [key]: value}}));
  const setRound = (round, key, value) => setFormData(prev => ({
    ...prev, config_json: {
      ...prev.config_json,
      rounds: { ...prev.config_json.rounds, [round]: { ...prev.config_json.rounds[round], [key]: value } }
    }
  }));

  const validateStep1 = () => {
    const { title, company_name, department, experience_level, openings } = formData;
    const { location, work_mode } = formData.config_json;
    
    if (!title || !company_name || !department || !experience_level || !openings || !location || !work_mode) {
      toast.error("Please fill out all required fields marked with *"); 
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.description) { toast.error("Job Description is required"); return false; }
    if (formData.config_json.must_have_skills.length === 0) { toast.error("At least one Must-Have Skill is required"); return false; }
    return true;
  };

  const submitJob = async () => {
    setLoading(true);
    try {
      const flatSkills = [...new Set([...formData.config_json.must_have_skills, ...formData.config_json.nice_to_have_skills])];
      // Sync topics to config
      const finalData = { 
          ...formData, 
          skills_required: flatSkills,
          config_json: {
              ...formData.config_json,
              rounds: {
                  ...formData.config_json.rounds,
                  coding: { ...formData.config_json.rounds.coding, topics }
              }
          }
      };
      
      const res = await api.post('/jobs/', finalData);
      toast.success("Job Created! Now configure the AI Assessment.");
      navigate(`/hiring-jobs/${res.data.id}/assessment-builder`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Post New Role & Configure Exam</h1>
        <p className="text-gray-400">Step {step}: {step === 1 ? 'Job Details' : step === 2 ? 'Requirements' : step === 3 ? 'Assessment Config' : 'Final Review'}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-dark-border -z-10"></div>
        {[1, 2, 3, 4].map(st => (
          <div key={st} onClick={() => { if (st < step) setStep(st); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-dark-bg ${st < step ? 'cursor-pointer hover:scale-105' : ''} transition-all ${step >= st ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-dark-surface text-gray-500'}`}>
            {st}
          </div>
        ))}
      </div>

      <Card className="border-white/5 bg-dark-bg/60 backdrop-blur-xl">
        {/* ── STEP 1: Basic Details ── */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2"><BriefcaseIcon className="text-primary-400" size={20}/> Basic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input required label="Job Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Senior Software Engineer"/>
              <Input required label="Company Name" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="e.g. Google, Stripe"/>
              <Input required label="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Engineering"/>
              <Select required label="Experience Level" value={formData.experience_level} onChange={e => setFormData({...formData, experience_level: e.target.value})} options={[{label:'Entry Level',value:'Entry Level'},{label:'Mid Level',value:'Mid Level'},{label:'Senior Level',value:'Senior Level'},{label:'Director',value:'Director'}]}/>
              <Input type="number" label="Number of Openings" value={formData.openings} onChange={e => setFormData({...formData, openings: parseInt(e.target.value)})} min="1"/>
              <Input label="Salary Range (Optional)" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="e.g. $120k - $160k" icon={DollarSign}/>
              <Input required label="Location" value={formData.config_json.location} onChange={e => setConfig('location', e.target.value)} placeholder="e.g. New York, NY" icon={MapPin}/>
              <Select required label="Work Mode" value={formData.config_json.work_mode} onChange={e => setConfig('work_mode', e.target.value)} options={[{label:'On-site',value:'On-site'},{label:'Hybrid',value:'Hybrid'},{label:'Remote',value:'Remote'}]}/>
            </div>
            <div className="flex justify-end pt-6 border-t border-white/5">
              <button onClick={() => { if (validateStep1()) setStep(2); }} className="px-8 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-900/20">Next <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Requirements ── */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-primary-400" size={20}/> Role & Skills</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-400">Job Description <span className="text-red-500">*</span></label>
              <textarea rows={8} className="w-full bg-dark-bg/40 border border-white/10 rounded-2xl p-4 outline-none transition-all text-white focus:border-primary-500/50 focus:bg-dark-bg/60" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the mission and responsibilities..."></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <TagInput label="Must-Have Skills" tags={formData.config_json.must_have_skills} setTags={(t) => setConfig('must_have_skills', t)} placeholder="Add core skills..."/>
              <TagInput label="Nice-to-Have Skills" tags={formData.config_json.nice_to_have_skills} setTags={(t) => setConfig('nice_to_have_skills', t)} placeholder="Add desirable skills..."/>
            </div>
            <div className="flex justify-between pt-6 border-t border-white/5">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-colors">Back</button>
              <button onClick={() => { if (validateStep2()) setStep(3); }} className="px-8 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-900/20">Configure AI Rounds <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Assessment Config (Single Source of Truth) ── */}
        {step === 3 && (
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-1">
                <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="text-blue-400" size={20}/> Exam Configuration</h2>
                <p className="text-xs text-gray-500">Define the parameters Gemini AI will use to build your assessment.</p>
            </div>

            {/* Resume Round */}
            <div className="p-6 border border-white/5 bg-white/5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">Resume Score Threshold</h3>
                <span className="text-xs font-mono font-bold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">{formData.config_json.rounds.resume.threshold}% Match</span>
              </div>
              <input type="range" min="0" max="100" className="w-full h-2 accent-primary-500 bg-dark-surface rounded-lg cursor-pointer" value={formData.config_json.rounds.resume.threshold} onChange={e => setRound('resume', 'threshold', parseInt(e.target.value))}/>
              <p className="text-[10px] text-gray-500">Candidates scoring below this based on their CV will be automatically filtered.</p>
            </div>

            {/* AI Video Interview */}
            <div className={`p-6 border rounded-2xl transition-all ${formData.config_json.rounds.interview.enabled ? 'border-primary-500/30 bg-primary-500/5' : 'border-white/5 bg-dark-bg/50 opacity-50'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400"><Video size={20}/></div>
                    <div>
                        <h3 className="font-bold text-white">AI Speech Interview</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Verbal Communication & Logic</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.config_json.rounds.interview.enabled} onChange={e => setRound('interview', 'enabled', e.target.checked)} className="sr-only peer"/>
                  <div className="w-12 h-6 bg-dark-surface rounded-full peer peer-checked:after:translate-x-[24px] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              {formData.config_json.rounds.interview.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Input type="number" label="Q Count" value={formData.config_json.rounds.interview.questions} onChange={e => setRound('interview', 'questions', parseInt(e.target.value))}/>
                  <Select label="Difficulty" value={formData.config_json.rounds.interview.difficulty} onChange={e => setRound('interview', 'difficulty', e.target.value)} options={[{value:'Easy',label:'Easy'},{value:'Medium',label:'Medium'},{value:'Hard',label:'Hard'}]}/>
                  <Input type="number" label="Think Time (s)" value={formData.config_json.rounds.interview.think_time} onChange={e => setRound('interview', 'think_time', parseInt(e.target.value))}/>
                  <Input type="number" label="Answer Time (s)" value={formData.config_json.rounds.interview.answer_time} onChange={e => setRound('interview', 'answer_time', parseInt(e.target.value))}/>
                  <Input type="number" label="Edit Time (s)" value={formData.config_json.rounds.interview.edit_time ?? 30} onChange={e => setRound('interview', 'edit_time', parseInt(e.target.value))}/>
                </div>
              )}
            </div>

            {/* Technical Coding Round */}
            <div className={`p-6 border rounded-2xl transition-all ${formData.config_json.rounds.coding.enabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-dark-bg/50 opacity-50'}`}>
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><Code size={20}/></div>
                    <div>
                        <h3 className="font-bold text-white">Technical Coding Lab</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Algorithm & Logic Execution</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.config_json.rounds.coding.enabled} onChange={e => setRound('coding', 'enabled', e.target.checked)} className="sr-only peer"/>
                  <div className="w-12 h-6 bg-dark-surface rounded-full peer peer-checked:after:translate-x-[24px] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {formData.config_json.rounds.coding.enabled && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input type="number" label="Q Count" value={formData.config_json.rounds.coding.questions} onChange={e => setRound('coding', 'questions', parseInt(e.target.value))} min="1"/>
                    <Select label="Difficulty" value={formData.config_json.rounds.coding.difficulty} onChange={e => setRound('coding', 'difficulty', e.target.value)} options={[{value:'Easy',label:'Easy'},{value:'Medium',label:'Medium'},{value:'Hard',label:'Hard'}]}/>
                    <Input type="number" label="Duration (min)" value={formData.config_json.rounds.coding.total_time} onChange={e => setRound('coding', 'total_time', parseInt(e.target.value))}/>
                  </div>
                  <TagInput label="Primary Algorithm Topics (Used by AI)" tags={topics} setTags={setTopics} placeholder="e.g. hashmap, strings, dp..."/>
                </div>
              )}
            </div>

            {/* Proctoring Settings */}
            <div className="p-6 border border-white/5 bg-dark-bg/40 rounded-2xl">
               <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400"><ShieldCheck size={20}/></div>
                    <div>
                        <h3 className="font-bold text-white">Advanced Proctoring</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Anti-Cheat & Security</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input type="number" label="Warning Limit" value={formData.config_json.rounds.proctoring.warning_limit} onChange={e => setRound('proctoring', 'warning_limit', parseInt(e.target.value))} placeholder="e.g. 3"/>
                    <Input type="number" label="Capture Interval (s)" value={formData.config_json.rounds.proctoring.scan_interval} onChange={e => setRound('proctoring', 'scan_interval', parseInt(e.target.value))} placeholder="e.g. 30"/>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-white/5">
              <button onClick={() => setStep(2)} className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-colors">Back</button>
              <button onClick={() => setStep(4)} className="px-8 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-900/20">Final Review <ArrowRight size={18}/></button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Deploy ── */}
        {step === 4 && (
          <div className="space-y-8 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2"><Eye className="text-secondary-400" size={20}/> Review Assessment Profile</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white">{formData.title}</h3>
                            <span className="px-3 py-1 bg-primary-500/10 text-primary-400 text-xs font-bold rounded-lg border border-primary-500/20">{formData.experience_level}</span>
                        </div>
                        <p className="text-gray-400 text-sm italic">{formData.company_name} • {formData.config_json.location} • {formData.config_json.work_mode}</p>
                        <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                            <DollarSign size={16}/> {formData.salary || 'Competitive'}
                        </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Enabling Rounds</h4>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-3 bg-dark-bg/40 rounded-xl border border-white/5">
                                <span className="text-sm font-medium text-white">Resume Screening</span>
                                <span className="text-xs text-primary-400 font-bold">{formData.config_json.rounds.resume.threshold}% Threshold</span>
                            </div>
                            {formData.config_json.rounds.interview.enabled && (
                                <div className="flex items-center justify-between p-3 bg-dark-bg/40 rounded-xl border border-white/5">
                                    <span className="text-sm font-medium text-white inline-flex items-center gap-2"><Video size={14}/> Speech Interview</span>
                                    <span className="text-xs text-primary-400 font-bold">{formData.config_json.rounds.interview.questions} Questions</span>
                                </div>
                            )}
                            {formData.config_json.rounds.coding.enabled && (
                                <div className="flex items-center justify-between p-3 bg-dark-bg/40 rounded-xl border border-white/5">
                                    <span className="text-sm font-medium text-white inline-flex items-center gap-2"><Code size={14}/> Technical Lab</span>
                                    <span className="text-xs text-blue-400 font-bold">{formData.config_json.rounds.coding.questions} Questions</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                     <div className="p-6 bg-primary-500/10 rounded-2xl border border-primary-500/20">
                        <h4 className="font-bold text-white mb-4">Pipeline Summary</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <CheckCircle size={16} className="text-green-500"/> Multi-stage automatic filtering
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300 mt-2">
                            <CheckCircle size={16} className="text-green-500"/> Proctoring enabled
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300 mt-2">
                            <CheckCircle size={16} className="text-green-500"/> AI generated question banks
                        </div>
                     </div>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-white/5">
              <button onClick={() => setStep(3)} className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-colors">Back</button>
              <button onClick={submitJob} disabled={loading} className="px-10 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-primary-900/40">
                  {loading ? 'Publishing...' : <><span className="mr-2">Confirm & Build Assessment</span> <ArrowRight size={20}/></>}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CreateJob;
