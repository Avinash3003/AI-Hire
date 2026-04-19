import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Camera, Mic, Play, CheckCircle2, AlertTriangle, Code2, Video, AlertOctagon, Terminal, Clock, XCircle, ArrowRight, Save, Headphones, Settings } from 'lucide-react';
import Editor from '@monaco-editor/react';

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
const useCountdown = (initialSeconds, onExpire) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { 
          clearInterval(timerRef.current); 
          onExpire?.(); 
          return 0; 
        }
        return s - 1;
      });
    }, 1000);
  }, [onExpire]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  const reset = useCallback((newSeconds) => {
    clearInterval(timerRef.current);
    setSeconds(newSeconds ?? initialSeconds);
  }, [initialSeconds]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const isLow = seconds < 10; // Red alert for very low time

  return { seconds, mins, secs, isLow, start, stop, reset };
};

// ─── Live Webcam Circle ───────────────────────────────────────────────────────
const LiveCamera = ({ active }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {});
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [active]);

  return (
    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 mb-6 relative bg-slate-950 shadow-[0_0_20px_rgba(0,0,0,0.6)] shrink-0">
      {active ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]"/>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Camera className="text-slate-700" size={32}/>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-900/90 text-[9px] text-white flex items-center justify-center uppercase tracking-widest font-bold">
        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${active ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}/>
        {active ? 'Live' : 'Standby'}
      </div>
    </div>
  );
};

// ─── Interactive Timer Badge ──────────────────────────────────────────────────
const TimerBadge = ({ mins, secs, isLow, label, icon: Icon }) => (
  <div className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl font-mono font-bold text-xl transition-all ${isLow ? 'bg-red-500/30 border-red-500/50 text-red-400 animate-pulse scale-105' : 'bg-slate-900/80 border-slate-700 text-white'}`}>
    <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase tracking-tighter text-slate-400 font-sans mb-0.5">{label}</span>
        <div className="flex items-center gap-2">
            {Icon && <Icon size={18} className={isLow ? 'text-red-400' : 'text-blue-400'}/>}
            {mins}:{secs}
        </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AssessmentEngine = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Assessment Stages: welcome -> interview -> coding -> complete
  const [stage, setStage] = useState('welcome');
  const [submitting, setSubmitting] = useState(false);
  
  // Permissions
  const [permissions, setPermissions] = useState({ camera: null, mic: null });
  
  // Interview Phase state: think -> speak
  const [interviewPhase, setInterviewPhase] = useState('none'); 
  const [transcript, setTranscript] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  
  // Coding state
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');
  
  // Proctoring
  const [warnings, setWarnings] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // ─── Timers ────────────────────────────────────────────────────────────────
  const codingTotalSecs = (data?.applications?.jobs?.config_json?.rounds?.coding?.total_time || 60) * 60;
  
  // Handler for Phase Endings
  const onThinkTimeEnd = useCallback(() => {
    toast('Thinking time up! Start speaking now.', { icon: '🎤' });
    setInterviewPhase('speak');
  }, []);

  const onSpeakTimeEnd = useCallback(() => {
    toast('Answer time up! Saving...', { icon: '💾' });
    handlePhaseComplete();
  }, []);

  const onCodingTimeEnd = useCallback(() => {
    toast.error('Coding round time elapsed! Submitting...', { icon: '⏰' });
    forceSubmitAll();
  }, []);

  const codingTimer = useCountdown(codingTotalSecs, onCodingTimeEnd);
  const thinkTimer = useCountdown(30, onThinkTimeEnd);
  const speakTimer = useCountdown(60, onSpeakTimeEnd);

  const forceSubmitAll = useCallback(async () => {
    try {
      await api.post(`/assessments/${token}/interview`, { transcript: 'FORCED SUBMIT: ' + transcript });
      await api.post(`/assessments/${token}/coding`, { code: '// FORCED SUBMIT\n' + code });
    } catch (e) {}
    setStage('complete');
    setCameraActive(false);
    thinkTimer.stop();
    speakTimer.stop();
    codingTimer.stop();
  }, [token, transcript, code, thinkTimer, speakTimer, codingTimer]);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await api.get(`/assessments/verify/${token}`);
        setData(res.data);
        if (res.data.coding_question) {
          setCode(res.data.coding_question.function_signature + '\n    # write logic here\n    pass\n');
        } else {
          setCode('def solve(input):\n    # write your solution here\n    pass\n');
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired assessment link.');
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  // Handle Stage & Phase Transitions
  useEffect(() => {
    if (stage === 'interview') {
        const conf = data?.applications?.jobs?.config_json?.rounds?.interview;
        setInterviewPhase('think');
        thinkTimer.reset(conf?.think_time || 30);
        thinkTimer.start();
    } else if (stage === 'coding') {
        setInterviewPhase('none');
        codingTimer.start();
    } else if (stage === 'complete') {
        setInterviewPhase('none');
        setCameraActive(false);
    }
  }, [stage]);

  useEffect(() => {
    if (interviewPhase === 'speak') {
        const conf = data?.applications?.jobs?.config_json?.rounds?.interview;
        thinkTimer.stop();
        speakTimer.reset(conf?.answer_time || 120);
        speakTimer.start();
    }
  }, [interviewPhase]);

  // Proctoring Listeners
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && data && stage !== 'welcome' && stage !== 'complete') {
        setWarnings(w => {
          const nw = w + 1;
          const limit = data?.applications?.jobs?.config_json?.rounds?.proctoring?.warning_limit || 3;
          if (nw >= limit) { 
            toast.error('Limit reached. Force terminating.', { icon: '🚨' }); 
            forceSubmitAll(); 
          }
          else toast.error(`Tab switch! (Warning ${nw}/${limit})`, { icon: '🚨' });
          return nw;
        });
      }
    };
    const handleFullscreen = () => {
      if (!document.fullscreenElement && data && stage !== 'welcome' && stage !== 'complete') {
        setWarnings(w => {
          const nw = w + 1;
          const limit = data?.applications?.jobs?.config_json?.rounds?.proctoring?.warning_limit || 3;
          if (nw >= limit) { forceSubmitAll(); }
          else toast.error(`Exited fullscreen! (Warning ${nw}/${limit})`, { icon: '🚨' });
          return nw;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [data, stage, forceSubmitAll]);

  const runSystemCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissions({ camera: true, mic: true });
      stream.getTracks().forEach(t => t.stop());
      toast.success('System verified.');
    } catch {
      setPermissions({ camera: false, mic: false });
      toast.error('Camera/Mic access required.');
    }
  };

  const handlePhaseComplete = async () => {
    try {
        setSubmitting(true);
        const conf = data?.applications?.jobs?.config_json?.rounds || {};
        
        // Save current question
        await api.post(`/assessments/${token}/interview`, { transcript });
        setTranscript('');
        speakTimer.stop();
        
        const currentQNum = questionIndex + 1;
        const totalQs = conf.interview?.questions || 1;
        
        if (currentQNum < totalQs) {
            setQuestionIndex(prev => prev + 1);
            setInterviewPhase('think'); // Loop back to think phase for next question
            thinkTimer.reset(conf.interview?.think_time || 30);
            thinkTimer.start();
            toast.success(`Question ${currentQNum} submitted.`);
        } else {
            toast.success('Interview Round Complete!');
            if (conf.coding?.enabled) setStage('coding');
            else setStage('complete');
        }
    } catch {
        toast.error('Failed to submit response.');
    } finally {
        setSubmitting(false);
    }
  };

  const skipToSpeak = () => {
      thinkTimer.stop();
      setInterviewPhase('speak');
  };

  const handleNextStage = async () => {
    try {
      setSubmitting(true);
      const conf = data?.applications?.jobs?.config_json?.rounds || {};

      if (stage === 'welcome') {
        if (!permissions.camera || !permissions.mic) { toast.error('Incomplete diagnostics.'); setSubmitting(false); return; }
        try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); }
        catch { toast.error('Fullscreen required.'); setSubmitting(false); return; }
        setCameraActive(true);
        if (conf.interview?.enabled) setStage('interview');
        else if (conf.coding?.enabled) setStage('coding');
        else setStage('complete');
      }
      else if (stage === 'coding') {
        codingTimer.stop();
        await api.post(`/assessments/${token}/coding`, { code });
        toast.success('Coding Assessment Submitted.');
        setStage('complete');
      }
    } catch {
      toast.error('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const runMockCode = () => setConsoleOutput('> Executing...\n> Passing Test Case 1...\n> Passing Test Case 2...\n> Output: True\n> Execution completed in 12ms.');

  if (loading) return <div className="w-full flex items-center justify-center text-slate-500 font-bold min-h-screen bg-slate-950">Preparing secure environment...</div>;
  if (error) return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-red-500/20 p-8 rounded-2xl text-center max-w-md">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48}/>
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => navigate('/jobs')} className="mt-6 text-xs text-slate-500 underline uppercase tracking-widest font-bold">Return to Job Board</button>
      </div>
    </div>
  );

  const config = data.applications.jobs.config_json.rounds;

  return (
    <div className="w-full h-full flex selection:bg-blue-500/30 bg-slate-950 text-white min-h-screen overflow-hidden">

      {/* Timer Badge */}
      {stage === 'interview' && interviewPhase === 'think' && (
          <TimerBadge mins={thinkTimer.mins} secs={thinkTimer.secs} isLow={thinkTimer.isLow} label="Preparation" icon={Headphones}/>
      )}
      {stage === 'interview' && interviewPhase === 'speak' && (
          <TimerBadge mins={speakTimer.mins} secs={speakTimer.secs} isLow={speakTimer.isLow} label="Recording" icon={Mic}/>
      )}
      {stage === 'coding' && (
          <TimerBadge mins={codingTimer.mins} secs={codingTimer.secs} isLow={codingTimer.isLow} label="Time Remaining" icon={Clock}/>
      )}

      {/* Left Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-white/5 flex flex-col py-8 z-20 shadow-2xl relative">
        <div className="flex flex-col items-center">
            <LiveCamera active={cameraActive}/>
            <h3 className="text-white font-bold text-center px-4 mb-1 truncate w-full">{data.applications.full_name}</h3>
            <p className="text-[10px] text-slate-500 mb-8 truncate px-4 font-mono">{data.email}</p>
        </div>

        <div className="w-full px-6 space-y-8 flex-1">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pipeline</p>
            <div className="flex flex-col gap-2">
              <div className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${stage === 'welcome' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 scale-105' : 'bg-slate-950/50 border-white/5 text-slate-600 opacity-60'}`}>
                <CheckCircle2 size={16}/> <span className="text-xs font-bold">Verification</span>
              </div>
              {config.interview?.enabled && (
                <div className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${stage === 'interview' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 scale-105 shadow-lg' : stage === 'coding' || stage === 'complete' ? 'bg-slate-950 border-green-500/30 text-green-500' : 'bg-slate-950 border-white/5 text-slate-600 opacity-60'}`}>
                  <Video size={16}/> <span className="text-xs font-bold">AI Interview</span>
                </div>
              )}
              {config.coding?.enabled && (
                <div className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${stage === 'coding' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 scale-105 shadow-lg' : stage === 'complete' ? 'bg-slate-950 border-green-500/30 text-green-500' : 'bg-slate-950 border-white/5 text-slate-600 opacity-60'}`}>
                  <Code2 size={16}/> <span className="text-xs font-bold">Coding Lab</span>
                </div>
              )}
            </div>
          </div>

          {warnings > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2 animate-pulse">
              <AlertOctagon size={16} className="shrink-0 mt-0.5"/>
              <div>
                <p className="font-bold">Security Violation</p>
                <p className="opacity-80">Warning: {warnings}/{config.proctoring?.warning_limit || 3}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 pt-4 border-t border-white/5">
             <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                <Lock size={10}/> Secure Exam Sandbox
             </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">

        {/* WELCOME STAGE */}
        {stage === 'welcome' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full p-10 border border-white/5 bg-slate-900 border-t-blue-500 border-t-2 rounded-3xl animate-slide-up space-y-8 shadow-2xl">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Ready to begin?</h1>
                    <p className="text-slate-400 font-medium">Please perform a quick system diagnostics check before entering the secure room.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-950 rounded-3xl border border-white/5 flex flex-col items-center gap-4 text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${permissions.camera === true ? 'bg-green-500/20 text-green-400' : 'bg-slate-900 text-slate-500'}`}>
                            <Camera size={24}/>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Camera Check</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">{permissions.camera === true ? 'Detected' : 'Pending'}</p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-950 rounded-3xl border border-white/5 flex flex-col items-center gap-4 text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${permissions.mic === true ? 'bg-green-500/20 text-green-400' : 'bg-slate-900 text-slate-500'}`}>
                            <Mic size={24}/>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Mic Check</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">{permissions.mic === true ? 'Detected' : 'Pending'}</p>
                        </div>
                    </div>
                </div>

                {(!permissions.camera || !permissions.mic) ? (
                <button onClick={runSystemCheck} className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                    <Settings className="animate-spin text-slate-400" size={18}/> Request System Permissions
                </button>
                ) : (
                <button disabled={submitting} onClick={handleNextStage} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3 animate-pulse active:scale-[0.98]">
                    Enter Exam Room <ArrowRight size={18}/>
                </button>
                )}
            </div>
          </div>
        )}

        {/* INTERVIEW STAGE */}
        {stage === 'interview' && (
          <div className="flex-1 flex flex-col p-12 max-w-5xl mx-auto w-full animate-fade-in">
            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">{interviewPhase === 'think' ? 'Preparation Phase' : 'Recording Phase'}</span>
                <h2 className="text-3xl font-extrabold text-white">Question {questionIndex + 1} of {config.interview.questions}</h2>
              </div>
              <div className="flex items-center gap-6">
                  {interviewPhase === 'think' ? (
                      <button onClick={skipToSpeak} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5 uppercase tracking-wider">
                          <Play size={12}/> Start Answering Now
                      </button>
                  ) : (
                    <button disabled={submitting || !transcript.trim()} onClick={handlePhaseComplete} className="flex items-center gap-2 text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl shadow-lg border border-green-500/50 uppercase tracking-widest transition-all">
                        <Save size={14}/> {questionIndex + 1 < config.interview.questions ? 'Submit & Next' : 'Finish Stage'}
                    </button>
                  )}
              </div>
            </div>

            <div className={`p-10 rounded-3xl border transition-all duration-500 ${interviewPhase === 'think' ? 'bg-slate-900 border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.05)]' : 'bg-slate-950 border-white/10'}`}>
                <p className="text-2xl font-semibold text-slate-200 leading-snug">
                   {data?.interview_questions?.[questionIndex]?.question || 'Describe a difficult technical situation and how you resolved it.'}
                </p>
                {interviewPhase === 'think' && (
                    <div className="mt-8 flex items-center gap-3 text-blue-400/60 font-medium">
                        <Clock size={16} className="animate-spin-slow"/> 
                        <span className="text-sm">Prepare your thoughts. Recording starts automatically.</span>
                    </div>
                )}
            </div>

            <div className="mt-10 flex-1 relative group">
                <div className={`absolute -inset-1 rounded-3xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${interviewPhase === 'speak' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div className="relative h-full bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden">
                    <textarea
                        className={`w-full h-full bg-transparent p-10 text-xl text-white outline-none placeholder:text-slate-700 resize-none font-medium leading-relaxed transition-all ${interviewPhase === 'think' ? 'blur-sm pointer-events-none' : 'focus:bg-slate-900/20'}`}
                        placeholder={interviewPhase === 'think' ? 'Transcript locked during preparation...' : 'Start speaking... your answer will be transcribed here automatically (Mock Flow)...'}
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                    />
                    {interviewPhase === 'speak' && (
                        <div className="absolute right-10 bottom-10 flex flex-col items-center gap-2">
                             <div className="w-16 h-16 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                                <Mic size={28}/>
                             </div>
                             <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Recording</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* CODING STAGE */}
        {stage === 'coding' && (
          <div className="flex-1 flex flex-col animate-fade-in overflow-hidden">
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/40 shrink-0 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                        <Code2 size={22}/>
                    </div>
                    <div>
                        <h2 className="font-extrabold text-white text-lg leading-none">Logic & Performance Round</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Multi-question algorithm lab</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-950 border border-white/5 rounded-2xl px-2 py-1">
                        {['python', 'javascript'].map(l => (
                            <button key={l} onClick={() => setLanguage(l)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${language === l ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <button disabled={submitting} onClick={handleNextStage} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 border border-purple-400/30 flex items-center gap-2 transition-all active:scale-95">
                        <Save size={14}/> Submit Final Round
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-[35%] bg-slate-900/50 border-r border-white/5 p-8 overflow-y-auto flex flex-col custom-scrollbar">
                <div className="space-y-6">
                    <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 block">Active Challenge</span>
                        <h3 className="text-2xl font-extrabold text-white leading-tight">{data.coding_question?.title || 'System Architect Problem'}</h3>
                    </div>
                    <div className="prose prose-invert prose-sm text-slate-400 leading-relaxed bg-slate-950/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                        <p>{data.coding_question?.description || 'Write an efficient solution to solve this specialized logical constraint.'}</p>
                    </div>

                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ArrowRight size={10}/> TestCase Example</span>
                        <div className="bg-[#0f1117] p-5 rounded-2xl border border-white/5 font-mono text-xs space-y-3 shadow-2xl">
                            {data.coding_question?.public_testcases?.[0] ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-slate-500 uppercase text-[9px] font-bold">Input</p>
                                    <p className="text-blue-300 bg-blue-500/5 px-2 py-1 rounded inline-block">{JSON.stringify(data.coding_question.public_testcases[0].input)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 uppercase text-[9px] font-bold">Expectation</p>
                                    <p className="text-green-300 bg-green-500/5 px-2 py-1 rounded inline-block">{JSON.stringify(data.coding_question.public_testcases[0].output)}</p>
                                </div>
                            </>
                            ) : (
                            <p className="text-slate-600 italic">No example provided. Refer to constraints.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><Terminal size={14} className="text-slate-300"/> Stdout / Console</span>
                    <button onClick={runMockCode} className="px-4 py-1.5 text-[10px] font-bold bg-slate-850 hover:bg-slate-800 text-white rounded-xl border border-white/5 transition-all active:scale-95 shadow-lg">Run Buffer Tests</button>
                  </div>
                  <div className="w-full h-36 bg-[#0a0c10] rounded-2xl border border-white/5 p-4 overflow-y-auto font-mono text-[11px] text-slate-500 shadow-inner">
                    {consoleOutput || <div className="flex items-center gap-2 opacity-30"><Play size={10}/> Ready for execution...</div>}
                  </div>
                </div>
              </div>

              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language}
                  value={code}
                  onChange={setCode}
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 15, 
                    fontFamily: 'JetBrains Mono, monospace', 
                    fontWeight: 500,
                    lineNumbers: 'on',
                    padding: { top: 20 },
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    roundedSelection: true,
                    scrollbar: { vertical: 'visible', useShadows: false, verticalScrollbarSize: 8 }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE STAGE */}
        {stage === 'complete' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full p-12 text-center animate-zoom-in bg-slate-900 border border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-500 to-emerald-500"></div>
               <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 transition-transform group-hover:scale-110 duration-500">
                  <CheckCircle2 size={48} className="text-green-500" />
               </div>
               <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Well Done!</h1>
               <p className="text-slate-400 mb-10 leading-relaxed">Your assessment results and proctoring logs have been transmitted. Recruiters will contact you via email shortly.</p>
               <button disabled className="px-8 py-4 bg-slate-950 text-slate-600 font-bold rounded-2xl w-full border border-white/5 flex items-center justify-center gap-3">
                  <Lock size={16}/> Session Secured & Terminated
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentEngine;
