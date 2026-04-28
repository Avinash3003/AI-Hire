import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import {
  X, User, Mail, Phone, Briefcase, FileText, Code2, Mic,
  AlertOctagon, CheckCircle, XCircle, AlertTriangle, Shield,
  ChevronDown, ChevronUp, ZoomIn, ExternalLink, Star, Award,
  TrendingUp, Clock, Camera
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const scoreColor = (s) => {
  if (s >= 75) return 'text-emerald-600';
  if (s >= 50) return 'text-amber-600';
  return 'text-red-500';
};
const scoreBg = (s) => {
  if (s >= 75) return 'bg-emerald-50 border-emerald-200';
  if (s >= 50) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
};
const scoreBar = (s) => {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};
const violationLabel = {
  no_face:        { label: 'No Face Detected', icon: Camera,       color: 'text-red-600 bg-red-50 border-red-200' },
  multiple_faces: { label: 'Multiple Faces',   icon: AlertOctagon, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  face_turned:    { label: 'Face Turned Away', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  tab_switch:     { label: 'Tab Switch',        icon: AlertTriangle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  fullscreen_exit:{ label: 'Fullscreen Exit',  icon: XCircle,       color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, label, size = 80 }) => {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
      </svg>
      <div style={{ marginTop: -size * 0.72, zIndex: 1 }} className="flex flex-col items-center">
        <span className="text-xl font-black text-gray-900">{score}%</span>
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'blue' }) => (
  <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-gray-100`}>
    <div className={`w-8 h-8 rounded-xl bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
      <Icon size={16} className={`text-${color}-600`}/>
    </div>
    <div>
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
    </div>
  </div>
);

// ─── Violation Image Card ─────────────────────────────────────────────────────
const ViolationCard = ({ v, idx }) => {
  const [expanded, setExpanded] = useState(false);
  const info = violationLabel[v.type] || { label: v.type, icon: AlertTriangle, color: 'text-gray-600 bg-gray-50 border-gray-200' };
  const Icon = info.icon;
  const ts = v.timestamp ? new Date(v.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className={`border rounded-2xl overflow-hidden ${expanded ? 'col-span-2' : ''}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${info.color}`}>
        <Icon size={12}/>
        <span className="text-[10px] font-bold uppercase tracking-wide">{info.label}</span>
        <span className="ml-auto text-[10px] opacity-60 flex items-center gap-1"><Clock size={9}/> {ts}</span>
      </div>
      {v.image_url ? (
        <div className="relative group cursor-pointer bg-gray-900" onClick={() => setExpanded(e => !e)}>
          <img
            src={v.image_url}
            alt={`Violation ${idx + 1}`}
            loading="lazy"
            className={`w-full object-cover transition-all duration-300 ${expanded ? 'max-h-96' : 'h-28'} grayscale`}
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {expanded ? <ChevronUp className="text-white" size={20}/> : <ZoomIn className="text-white" size={20}/>}
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center bg-gray-50">
          <p className="text-[10px] text-gray-400 italic">No frame captured</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const CandidateReportModal = ({ appId, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({ coding: true, interview: true, proctoring: true, resume: true });

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  // Close on Escape
  const handleKeyDown = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
  }, [handleKeyDown]);

  // Lazy-load report only when modal opens
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/assessments/report/${appId}`);
        setReport(data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [appId]);

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-scale-in"
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        {/* ── Top Bar ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Candidate Evaluation Report</p>
            <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
              {loading ? 'Loading...' : report?.candidate?.name || '—'}
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X size={18} className="text-gray-600"/>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="px-7 py-6 space-y-7 overflow-y-auto">

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              <p className="text-gray-400 text-sm font-medium">Aggregating all assessment data...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600">
              <AlertOctagon size={20}/> {error}
            </div>
          )}

          {report && !loading && <>
            {/* ═════ SECTION 1: Candidate Info ════════════════════════════════ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1 bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
                <SectionHeader icon={User} title="Candidate Information" color="blue"/>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: User,     label: 'Name',     value: report.candidate.name },
                    { icon: Mail,     label: 'Email',    value: report.candidate.email },
                    { icon: Phone,    label: 'Phone',    value: report.candidate.phone || '—' },
                    { icon: Briefcase,label: 'Role',     value: report.job?.title || '—' },
                    { icon: Clock,    label: 'Applied',  value: new Date(report.candidate.applied_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon size={13} className="text-gray-400 shrink-0"/>
                      <span className="text-gray-400 text-xs w-14 shrink-0">{label}</span>
                      <span className="font-semibold text-gray-800 text-xs truncate">{value}</span>
                    </div>
                  ))}
                  {report.candidate.resume_url && (
                    <a href={report.candidate.resume_url} target="_blank" rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
                      <FileText size={12}/> View Resume <ExternalLink size={10}/>
                    </a>
                  )}
                </div>
              </div>

              {/* ═════ SECTION 2: Score Breakdown ═══════════════════════════════ */}
              <div className="col-span-2 md:col-span-1 bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionHeader icon={Award} title="Score Breakdown" color="emerald"/>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <ScoreRing score={report.scores.resume_score}    label="Resume"    size={90}/>
                  <ScoreRing score={report.scores.coding_score}    label="Coding"    size={90}/>
                  <ScoreRing score={report.scores.interview_score} label="Interview" size={90}/>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-[90px] h-[90px] rounded-2xl border-2 flex flex-col items-center justify-center ${scoreBg(report.scores.final_score)}`}>
                      <span className={`text-2xl font-black ${scoreColor(report.scores.final_score)}`}>{report.scores.final_score}%</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Final Score</span>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-white border border-gray-100 text-xs text-gray-500 leading-relaxed">
                  <span className="font-bold text-gray-700">Formula: </span>Resume×30% + Coding×40% + Interview×30%
                </div>
              </div>
            </div>

            {/* Resume Analysis (collapsible) */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection('resume')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-violet-50 border border-violet-100 rounded-lg flex items-center justify-center">
                    <FileText size={14} className="text-violet-600"/>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">Resume Analysis</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreBg(report.scores.resume_score)} ${scoreColor(report.scores.resume_score)}`}>
                    {report.scores.resume_score}%
                  </span>
                </div>
                {expandedSections.resume ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
              </button>
              {expandedSections.resume && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
                  {report.resume_analysis.recommendation && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 font-medium">
                      💡 {report.resume_analysis.recommendation}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {report.resume_analysis.strengths?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Strengths</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.resume_analysis.strengths.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.resume_analysis.missing_skills?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Missing Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.resume_analysis.missing_skills.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-semibold">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═════ SECTION 3: Coding Details ══════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection('coding')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                    <Code2 size={14} className="text-blue-600"/>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">Coding Assessment</span>
                  <span className="text-[10px] text-gray-400">{report.coding_results.length} question{report.coding_results.length !== 1 ? 's' : ''}</span>
                </div>
                {expandedSections.coding ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
              </button>
              {expandedSections.coding && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {report.coding_results.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400 italic">No coding submissions recorded.</div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {report.coding_results.map((cr, i) => {
                        const score = cr.efficiency_score || 0;
                        const passed = cr.test_cases_passed || 0;
                        const total  = cr.total_test_cases || 0;
                        const qTitle = cr.coding_questions?.title || `Question ${i + 1}`;
                        const diff   = cr.coding_questions?.difficulty || '';
                        return (
                          <div key={cr.id} className="rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${diff === 'Easy' ? 'bg-green-100 text-green-700' : diff === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {diff || 'Medium'}
                              </span>
                              <span className="font-bold text-gray-800 text-sm">{qTitle}</span>
                              <span className={`ml-auto font-black text-sm ${scoreColor(score)}`}>{score}%</span>
                            </div>
                            {cr.coding_questions?.description && (
                              <p className="text-xs text-gray-600 mb-3 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {cr.coding_questions.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full transition-all ${scoreBar(score)}`} style={{ width: `${score}%` }}/>
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">{passed}/{total} cases</span>
                            </div>
                            {cr.code_submitted && (
                              <div className="mt-2">
                                <p className="text-[10px] text-blue-500 font-bold mb-1">Candidate Code Output:</p>
                                <pre className="text-[10px] bg-gray-900 text-green-300 p-3 rounded-xl overflow-x-auto leading-relaxed font-mono max-h-40">
                                  {cr.code_submitted}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═════ SECTION 4: Interview Evaluation ════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection('interview')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-center">
                    <Mic size={14} className="text-purple-600"/>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">AI Interview Responses</span>
                  <span className="text-[10px] text-gray-400">{report.interview_results.length} answer{report.interview_results.length !== 1 ? 's' : ''}</span>
                </div>
                {expandedSections.interview ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
              </button>
              {expandedSections.interview && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {report.interview_results.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400 italic">No interview responses recorded.</div>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {report.interview_results.map((ir, i) => {
                        const comScore  = ir.communication_score >= 0 ? ir.communication_score : null;
                        const techScore = ir.technical_score >= 0 ? ir.technical_score : null;
                        return (
                          <div key={ir.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/50">
                            <p className="text-sm font-bold text-gray-800 leading-relaxed mb-2">
                              Q{i + 1}: {ir.interview_questions?.question || `Question ${i + 1} Response`}
                            </p>
                            {ir.transcript && (
                              <div className="bg-white rounded-lg border border-gray-100 p-3 mb-2 shadow-sm">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Candidate Answer</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{ir.transcript}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {comScore !== null ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                  Comm: {comScore}%
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                  Pending LLM Review
                                </span>
                              )}
                              {techScore !== null && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                                  Tech: {techScore}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═════ SECTION 5: Proctoring & Violations ═════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggleSection('proctoring')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                    <Shield size={14} className="text-red-600"/>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">Proctoring Report</span>
                  {report.proctoring.warnings_count > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
                      {report.proctoring.warnings_count} Violation{report.proctoring.warnings_count !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Clean
                    </span>
                  )}
                </div>
                {expandedSections.proctoring ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
              </button>
              {expandedSections.proctoring && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {report.proctoring.violations.length === 0 ? (
                    <div className="py-6 flex flex-col items-center text-center gap-2">
                      <CheckCircle className="text-emerald-500" size={32}/>
                      <p className="text-sm font-bold text-emerald-700">No violations recorded</p>
                      <p className="text-xs text-gray-400">This candidate completed the exam without any proctoring flags.</p>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {report.proctoring.violations.map((v, i) => (
                        <ViolationCard key={i} v={v} idx={i}/>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Action Footer ─── */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-300 font-mono">Report generated on demand · HireAI ATS</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors">
                  Close
                </button>
                {report.candidate.resume_url && (
                  <a href={report.candidate.resume_url} target="_blank" rel="noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                    <ExternalLink size={11}/> Open Resume
                  </a>
                )}
              </div>
            </div>
          </>}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in { animation: scaleIn 0.22s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
    </div>
  );
};

export default CandidateReportModal;
