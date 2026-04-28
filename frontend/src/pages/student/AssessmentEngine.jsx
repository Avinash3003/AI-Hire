import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Camera, Mic, MicOff, Play, CheckCircle2, AlertTriangle, Code2, Video,
  AlertOctagon, Terminal, Clock, ArrowRight, Save, Headphones,
  Settings, Lock, Edit3, StopCircle, ChevronRight
} from 'lucide-react';
import Editor from '@monaco-editor/react';

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
const useCountdown = (initialSeconds, onExpire) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef(null);
  const cbRef    = useRef(onExpire);
  useEffect(() => { cbRef.current = onExpire; }, [onExpire]);

  const start = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); cbRef.current?.(); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  const stop  = useCallback(() => clearInterval(timerRef.current), []);
  const reset = useCallback((n) => { clearInterval(timerRef.current); setSeconds(n ?? initialSeconds); }, [initialSeconds]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return { seconds, mins, secs, isLow: seconds < 30 && seconds > 0, start, stop, reset };
};

// ─── Language Template Builder ────────────────────────────────────────────────
const buildTemplate = (rawSig, language) => {
  const sigMatch  = rawSig?.match(/def\s+(\w+)\s*\(([^)]*)\)/);
  const fnName    = sigMatch?.[1] || 'solve';
  const params    = sigMatch?.[2] || '';
  const paramNames = params.split(',').map(p => p.trim().split(':')[0].trim().split('=')[0].trim()).filter(Boolean);
  const paramStr  = paramNames.join(', ');

  switch (language) {
    case 'python':
      return `${rawSig || `def ${fnName}(${paramStr}):`}\n    # Write your solution here\n    pass\n`;
    case 'javascript':
      return `function ${fnName}(${paramStr}) {\n    // Write your solution here\n    \n}\n`;
    case 'java':
      return `import java.util.*;\n\nclass Solution {\n    // Rename your method to "solve" — the runner uses reflection to call it\n    public Object solve(${paramNames.map(p => `Object ${p}`).join(', ')}) {\n        // Write your solution here\n        return null;\n    }\n}\n`;
    case 'cpp':
      return `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\n// Function must be named "solve" and return a value\n// For array input: read via cin in the function body\nauto solve() {\n    // Example: int n; cin >> n;\n    return 0; // replace with answer\n}\n`;
    default:
      return '// Write your solution here\n';
  }
};

// ─── STT Hook (Web Speech API — tuned for responsiveness) ────────────────────
const useSpeechToText = (onSpeech) => {
  const recRef    = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported) return;
    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang              = 'en-US';
    rec.continuous        = true;
    rec.interimResults    = true;
    rec.maxAlternatives   = 1;

    rec.onresult = (e) => {
      let finalStr = '';
      let interimStr = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalStr += e.results[i][0].transcript + ' ';
        else interimStr += e.results[i][0].transcript;
      }
      onSpeech(finalStr, interimStr);
    };
    rec.onerror = (e) => {
      if (e.error === 'network') return; // ignore network errors
      if (e.error !== 'no-speech') console.warn('STT:', e.error);
    };
    rec.onend = () => {
      // Auto-restart on end if still in listening mode (handles Chrome's 30s cutoff)
      if (recRef.current === rec) {
        try { rec.start(); } catch (_) { setIsListening(false); }
      }
    };
    recRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [supported, onSpeech]);

  const stop = useCallback(() => {
    const r = recRef.current;
    recRef.current = null;
    r?.stop();
    setIsListening(false);
  }, []);

  return { start, stop, isListening, isSupported: supported };
};

// ─── MediaPipe Face Detection Hook ───────────────────────────────────────────
const useFaceDetection = (videoRef, active, onViolation) => {
  const detectorRef   = useRef(null);
  const intervalRef   = useRef(null);
  const lastWarnRef   = useRef({}); // { [type]: timestamp }
  const COOLDOWN      = 8000; // ms between same-type warnings

  const warn = useCallback((type, message) => {
    const now = Date.now();
    if (now - (lastWarnRef.current[type] || 0) < COOLDOWN) return;
    lastWarnRef.current[type] = now;
    onViolation(type, message);
  }, [onViolation]);

  useEffect(() => {
    if (!active) {
      clearInterval(intervalRef.current);
      return;
    }

    const loadDetector = async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });

        // Run detection every 2 seconds
        intervalRef.current = setInterval(() => {
          const video = videoRef.current;
          if (!video || !detectorRef.current || video.readyState < 2) return;

          try {
            const result = detectorRef.current.detectForVideo(video, performance.now());
            const faces  = result.detections || [];

            if (faces.length === 0) {
              warn('no_face', 'No face detected! Please look at the camera.');
            } else if (faces.length > 1) {
              warn('multiple_faces', `${faces.length} faces detected! Only you should be present.`);
            } else {
              // Single face — check if it's looking away (rotated/side)
              const kp = faces[0]?.keypoints || [];
              if (kp.length >= 2) {
                const leftEye  = kp.find(p => p.label === 'leftEye')  || kp[0];
                const rightEye = kp.find(p => p.label === 'rightEye') || kp[1];
                if (leftEye && rightEye) {
                  const eyeDist = Math.abs(rightEye.x - leftEye.x);
                  // If eye distance too small, face is rotated sideways
                  if (eyeDist < 0.05) {
                    warn('face_turned', 'Please face the camera directly.');
                  }
                }
              }
            }
          } catch (e) { /* detector not ready */ }
        }, 2000);

      } catch (e) {
        console.warn('MediaPipe face detection unavailable:', e.message);
      }
    };

    loadDetector();
    return () => {
      clearInterval(intervalRef.current);
      detectorRef.current = null;
    };
  }, [active, videoRef, warn]);
};

// ─── Floating Camera Card ─────────────────────────────────────────────────────
const FloatingCamera = ({ active, streamRef, videoRef }) => {
  useEffect(() => {
    if (!active) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {});
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [active]);

  return (
    <div className="fixed bottom-6 right-6 z-50 shadow-2xl">
      <div className="w-44 h-32 rounded-2xl overflow-hidden border-2 border-white bg-gray-900 relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {active
          ? <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]"/>
          : <div className="w-full h-full flex items-center justify-center bg-gray-100"><Camera className="text-gray-400" size={28}/></div>
        }
        <div className="absolute inset-x-0 bottom-0 h-7 bg-black/60 text-[9px] text-white flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest">
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}/>
          {active ? 'Proctoring Live' : 'Camera Off'}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AssessmentEngine = () => {
  const { token }  = useParams();
  const navigate   = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [stage,      setStage]      = useState('welcome');
  const [submitting, setSubmitting] = useState(false);

  const [permissions,    setPermissions]    = useState({ camera: null, mic: null });
  const [interviewPhase, setInterviewPhase] = useState('none');
  const [transcript,     setTranscript]     = useState('');
  const [interimText,    setInterimText]    = useState('');
  const [questionIndex,  setQuestionIndex]  = useState(0);

  const MAX_RUNS = 2;

  const [codingQuestions, setCodingQuestions] = useState([]);
  const [codingIndex,     setCodingIndex]     = useState(0);
  const [codes,           setCodes]           = useState({});
  const [consoleOutput,   setConsoleOutput]   = useState('');
  const [language,        setLanguage]        = useState('python');
  const [runningCode,     setRunningCode]     = useState(false);
  const [runsLeft,        setRunsLeft]        = useState({}); // { [questionId]: runsLeft }

  const [warnings,       setWarnings]       = useState(0);
  const [cameraActive,   setCameraActive]   = useState(false);
  const [isBlurred,      setIsBlurred]      = useState(false);
  const [violationFlash, setViolationFlash] = useState(false);

  const cameraStreamRef        = useRef(null);
  const videoRef               = useRef(null);
  const lastBrowserWarnRef     = useRef(0);
  const lastViolationUploadRef = useRef({});
  const forceSubmitAllRef      = useRef(null);
  const handlePhaseCompleteRef = useRef(null);

  // ─── Timers ────────────────────────────────────────────────────────────────
  const codingTotalSecs = (data?.applications?.jobs?.config_json?.rounds?.coding?.total_time || 60) * 60;
  const onCodingTimeEnd = useCallback(() => { toast.error('Time up! Auto-submitting...'); forceSubmitAllRef.current?.(); }, []);
  const onThinkTimeEnd  = useCallback(() => { toast('Think time done!', { icon: '🎤' }); setInterviewPhase('speak'); }, []);
  const onSpeakTimeEnd  = useCallback(() => { toast('Recording done! Edit your answer.', { icon: '✏️' }); setInterviewPhase('edit'); }, []);
  const onEditTimeEnd   = useCallback(() => { toast('Edit time up! Saving...', { icon: '💾' }); handlePhaseCompleteRef.current?.(); }, []);

  const codingTimer = useCountdown(codingTotalSecs, onCodingTimeEnd);
  const thinkTimer  = useCountdown(30,  onThinkTimeEnd);
  const speakTimer  = useCountdown(120, onSpeakTimeEnd);
  const editTimer   = useCountdown(30,  onEditTimeEnd);

  // ─── STT ───────────────────────────────────────────────────────────────────
  const handleSpeech = useCallback((fStr, iStr) => {
    if (fStr) {
      setTranscript(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + fStr);
    }
    setInterimText(iStr);
  }, []);
  const stt = useSpeechToText(handleSpeech);

  useEffect(() => {
    if (interviewPhase === 'speak') { if (stt.isSupported) stt.start(); }
    else stt.stop();
  }, [interviewPhase]);

  // ─── MediaPipe Face Detection ───────────────────────────────────────────────
  const handleFaceViolation = useCallback((type, message) => {
    const now = Date.now();
    if (now - lastBrowserWarnRef.current < 2500) return;
    lastBrowserWarnRef.current = now;

    setViolationFlash(true);
    setTimeout(() => setViolationFlash(false), 600);
    captureAndUploadViolationRef.current?.(type);

    // Read current count synchronously via ref to avoid calling toast inside updater
    setWarnings(w => {
      const nw = w + 1;
      const limit = data?.applications?.jobs?.config_json?.rounds?.proctoring?.warning_limit || 3;
      // Schedule toast outside updater to avoid React double-invoke in dev
      setTimeout(() => {
        if (nw >= limit) { toast.error('Warning limit reached. Submitting.', { icon: '🚨' }); forceSubmitAllRef.current?.(); }
        else toast.error(`🚨 ${message} (Warning ${nw}/${limit})`, { id: `warn-${nw}`, duration: 5000 });
      }, 0);
      return nw;
    });
  }, [data]);

  useFaceDetection(videoRef, cameraActive, handleFaceViolation);

  // ─── Violation Frame Capture ────────────────────────────────────────────────
  const captureAndUploadViolation = useCallback(async (type) => {
    const now = Date.now();
    if (now - (lastViolationUploadRef.current[type] || 0) < 10000) return;
    lastViolationUploadRef.current[type] = now;

    let image_base64 = '';
    try {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width  = Math.min(video.videoWidth, 640);
        canvas.height = Math.round(video.videoHeight * (canvas.width / video.videoWidth));
        const ctx = canvas.getContext('2d');
        // Grayscale filter for violation frames as requested
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        image_base64 = canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) { /* non-blocking */ }

    try {
      await api.post(`/assessments/${token}/violation`, {
        type,
        timestamp: new Date().toISOString(),
        image_base64,
      });
    } catch (e) { /* non-blocking */ }
  }, [token]);

  const captureAndUploadViolationRef = useRef(captureAndUploadViolation);
  useEffect(() => { captureAndUploadViolationRef.current = captureAndUploadViolation; }, [captureAndUploadViolation]);

  // ─── Browser Proctoring Listeners ──────────────────────────────────────────
  useEffect(() => {
    const triggerBrowserViolation = (reason, type) => {
      const now = Date.now();
      if (now - lastBrowserWarnRef.current < 2500) return;
      lastBrowserWarnRef.current = now;

      setViolationFlash(true);
      setTimeout(() => setViolationFlash(false), 600);
      captureAndUploadViolationRef.current?.(type);

      setWarnings(w => {
        const nw = w + 1;
        const limit = data?.applications?.jobs?.config_json?.rounds?.proctoring?.warning_limit || 3;
        setTimeout(() => {
          if (nw >= limit) { toast.error('Warning limit reached. Force submitting.', { icon: '🚨' }); forceSubmitAllRef.current?.(); }
          else toast.error(`🚨 ${reason} (Warning ${nw}/${limit})`, { id: `warn-${nw}`, duration: 5000 });
        }, 0);
        return nw;
      });
    };

    const handleVisibility = () => {
      if (document.hidden && stage !== 'welcome' && stage !== 'complete')
        triggerBrowserViolation('Tab switch detected!', 'tab_switch');
    };
    const handleFullscreen = () => {
      if (!document.fullscreenElement && stage !== 'welcome' && stage !== 'complete') {
        setIsBlurred(true);
        triggerBrowserViolation('Exited fullscreen!', 'fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [data, stage]);

  // ─── Force Submit ──────────────────────────────────────────────────────────
  const forceSubmitAll = useCallback(async () => {
    stt.stop();
    try {
      const currentQ = data?.interview_questions?.[questionIndex];
      await api.post(`/assessments/${token}/interview`, { 
        transcript: 'FORCED: ' + transcript,
        question_id: currentQ?.id
      });
      const qIds = Object.keys(codes);
      for (let i = 0; i < qIds.length; i++) {
        await api.post(`/assessments/${token}/coding`, {
          code: codes[qIds[i]]?.[language] || '',
          question_id: qIds[i],
          language,
          is_final: i === qIds.length - 1,
        });
      }
    } catch (_) {}
    setStage('complete');
    setCameraActive(false);
    thinkTimer.stop(); speakTimer.stop(); codingTimer.stop();
  }, [token, transcript, codes, language, thinkTimer, speakTimer, codingTimer, stt]);

  useEffect(() => { forceSubmitAllRef.current = forceSubmitAll; }, [forceSubmitAll]);

  // ─── Load Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/assessments/verify/${token}`);
        setData(res.data);
        const qs = res.data.coding_questions || [];
        setCodingQuestions(qs);
        const init = {};
        qs.forEach(q => {
          const sig = q.function_signature || 'def solve():';
          init[q.id] = {
            python:     buildTemplate(sig, 'python'),
            javascript: buildTemplate(sig, 'javascript'),
            java:       buildTemplate(sig, 'java'),
            cpp:        buildTemplate(sig, 'cpp'),
          };
        });
        setCodes(init);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invalid or expired assessment link.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ─── Stage Transitions ─────────────────────────────────────────────────────
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
      stt.stop();
    }
  }, [stage]);

  useEffect(() => {
    if (interviewPhase === 'speak') {
      const conf = data?.applications?.jobs?.config_json?.rounds?.interview;
      thinkTimer.stop();
      setTranscript('');
      speakTimer.reset(conf?.answer_time || 120);
      speakTimer.start();
    } else if (interviewPhase === 'edit') {
      // Stop recording, start edit countdown
      stt.stop();
      speakTimer.stop();
      const conf = data?.applications?.jobs?.config_json?.rounds?.interview;
      const editSecs = conf?.edit_time ?? 30;
      editTimer.reset(editSecs);
      editTimer.start();
    }
  }, [interviewPhase]);

  // ─── Coding Helpers ────────────────────────────────────────────────────────
  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    const currentQ = codingQuestions[codingIndex];
    if (!currentQ) return;
    setCodes(prev => {
      const qCodes = prev[currentQ.id] || {};
      if (!qCodes[newLang]) {
        return { ...prev, [currentQ.id]: { ...qCodes, [newLang]: buildTemplate(currentQ.function_signature, newLang) } };
      }
      return prev;
    });
  }, [codingQuestions, codingIndex]);

  const updateCurrentCode = useCallback((newVal) => {
    const currentQ = codingQuestions[codingIndex];
    if (!currentQ) return;
    setTimeout(() => {
      setCodes(prev => {
        const qCodes = prev[currentQ.id] || {};
        if (qCodes[language] === newVal) return prev;
        return { ...prev, [currentQ.id]: { ...qCodes, [language]: newVal } };
      });
    }, 0);
  }, [codingQuestions, codingIndex, language]);

  const runRealCode = async () => {
    const currentQ = codingQuestions[codingIndex];
    if (!currentQ) return;

    // ─── Run limit check ────────────────────────────────────────────────────
    const qRuns = runsLeft[currentQ.id] ?? MAX_RUNS;
    if (qRuns <= 0) {
      toast.error('Run limit reached. Submit your solution.');
      return;
    }

    setRunningCode(true);
    setConsoleOutput('> 🤖 LLM is tracing your code against test cases...\n> (This may take 5–10 seconds)');

    try {
      const res = await api.post(`/assessments/${token}/coding/run`, {
        code: codes[currentQ.id]?.[language] || '',
        question_id: currentQ.id,
        language,
      });

      if (res.data.status === 'error' || res.data.error) {
        // ─── Quota / API errors: do NOT waste a run ────────────────
        if (res.data.quota_error) {
          setConsoleOutput(
            '> ⚠️  LLM quota exceeded or service temporarily unavailable.\n' +
            '> Your run was NOT counted against your limit.\n' +
            '> Please wait a moment and try again, or go ahead and submit.'
          );
          toast.error('AI evaluator quota exceeded — run not charged.', { duration: 6000 });
          return; // don't decrement
        }
        // Code / syntax error — counts as a real run attempt
        setRunsLeft(prev => ({ ...prev, [currentQ.id]: Math.max(0, (prev[currentQ.id] ?? MAX_RUNS) - 1) }));
        setConsoleOutput(`> ❌  ${res.data.error}`);
        return;
      }

      // Success — decrement AFTER confirmed response
      setRunsLeft(prev => ({ ...prev, [currentQ.id]: (prev[currentQ.id] ?? MAX_RUNS) - 1 }));

      let out = '';
      const results = res.data.results || [];
      const passedN = results.filter(r => r.passed).length;
      out += `Score: ${res.data.score ?? 0}%  (${passedN}/${results.length} test cases passed)\n`;
      out += `${'\u2500'.repeat(48)}\n\n`;

      results.forEach((r, idx) => {
        const status = r.passed ? '✅ PASSED' : '❌ FAILED';
        out += `Test ${idx + 1}: ${status}\n`;
        out += `  Input    → ${r.input}\n`;
        out += `  Expected → ${r.expected}\n`;
        out += `  Got      → ${r.actual}\n`;
        if (r.note) out += `  Note     → ${r.note}\n`;
        out += '\n';
      });

      setConsoleOutput(out || '> No test cases ran.');
    } catch (e) {
      // Network / server crash — do NOT decrement (not the candidate's fault)
      setConsoleOutput(`> Network error: ${e.message}\n> Your run was NOT counted. Please try again.`);
      toast.error('Connection error — run not charged.');
    } finally {
      setRunningCode(false);
    }
  };

  // ─── System Check ──────────────────────────────────────────────────────────
  const runSystemCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissions({ camera: stream.getVideoTracks().length > 0, mic: stream.getAudioTracks().length > 0 });
      stream.getTracks().forEach(t => t.stop());
      toast.success('System verified! Camera & Mic ready.');
    } catch {
      setPermissions({ camera: false, mic: false });
      toast.error('Camera/Mic access denied.');
    }
  };

  // ─── Interview Submit ──────────────────────────────────────────────────────
  const handlePhaseComplete = useCallback(async () => {
    stt.stop();
    editTimer.stop();
    speakTimer.stop();

    const currentConf = data?.applications?.jobs?.config_json?.rounds?.interview;
    const editSecs = currentConf?.edit_time ?? 30;

    if (interviewPhase === 'speak' && editSecs > 0) {
      setInterviewPhase('edit');
      return;
    }

    // Only submit when explicitly called from edit phase or edit_time=0
    try {
      setSubmitting(true);
      const conf     = data?.applications?.jobs?.config_json?.rounds || {};
      const editSecs = conf?.interview?.edit_time ?? 30;
      const currentQ = data?.interview_questions?.[questionIndex];
      await api.post(`/assessments/${token}/interview`, { transcript, question_id: currentQ?.id });

      const next  = questionIndex + 1;
      const total = conf.interview?.questions || 1;
      setTranscript('');
      editTimer.stop();

      if (next < total) {
        setQuestionIndex(next);
        setInterviewPhase('think');
        thinkTimer.reset(conf.interview?.think_time || 30);
        thinkTimer.start();
        toast.success(`Answer saved! Question ${next + 1} of ${total}.`);
      } else {
        toast.success('Interview complete!');
        if (conf.coding?.enabled) setStage('coding');
        else setStage('complete');
      }
    } catch { toast.error('Submission failed.'); }
    finally { setSubmitting(false); }
  }, [data, questionIndex, transcript, token, speakTimer, editTimer, thinkTimer, stt]);

  useEffect(() => { handlePhaseCompleteRef.current = handlePhaseComplete; }, [handlePhaseComplete]);

  // ─── Main Stage Navigation ─────────────────────────────────────────────────
  const handleNextStage = async () => {
    try {
      setSubmitting(true);
      const conf = data?.applications?.jobs?.config_json?.rounds || {};

      if (stage === 'welcome') {
        if (!permissions.camera || !permissions.mic) { toast.error('Run system check first.'); return; }
        try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); }
        catch { toast.error('Fullscreen required.'); return; }
        setCameraActive(true);
        if (conf.interview?.enabled) setStage('interview');
        else if (conf.coding?.enabled) setStage('coding');
        else setStage('complete');
        return;
      }

      if (stage === 'coding') {
        const currentQ  = codingQuestions[codingIndex];
        const is_final  = codingIndex + 1 >= codingQuestions.length;
        await api.post(`/assessments/${token}/coding`, {
          code: codes[currentQ.id]?.[language] || '',
          question_id: currentQ.id,
          language,
          is_final,
        });
        if (!is_final) {
          setCodingIndex(p => p + 1);
          setConsoleOutput('');
          // Reset run counter for next question
          const nextQ = codingQuestions[codingIndex + 1];
          if (nextQ) setRunsLeft(prev => ({ ...prev, [nextQ.id]: MAX_RUNS }));
          toast.success('Solution saved! Next challenge.');
        } else {
          codingTimer.stop();
          toast.success('All submissions complete!');
          setStage('complete');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Submission failed';
      toast.error(`Submit error: ${msg}`, { duration: 6000 });
    }
    finally { setSubmitting(false); }
  };

  // ─── Render Guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-gray-500 font-medium">Preparing secure environment...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-red-100 shadow-2xl p-10 rounded-3xl text-center max-w-md">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48}/>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-red-500 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/jobs')} className="text-xs text-gray-400 underline">Back to Job Board</button>
      </div>
    </div>
  );

  const config       = data?.applications?.jobs?.config_json?.rounds || {};
  const warningLimit = config?.proctoring?.warning_limit || 3;
  const currentQ_I   = data?.interview_questions?.[questionIndex];
  const currentQ_C   = codingQuestions[codingIndex];

  return (
    <div
      className={`w-full min-h-screen flex bg-gray-50 text-gray-900 overflow-hidden select-none relative transition-all ${violationFlash ? 'outline outline-8 outline-red-500' : ''}`}
      onCopy={e  => { e.preventDefault(); toast.error('Copy disabled.'); }}
      onPaste={e => { e.preventDefault(); toast.error('Paste disabled.'); }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* ── Violation Overlay ── */}
      {isBlurred && (
        <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-2xl flex flex-col items-center justify-center">
          <div className="bg-white border border-red-100 shadow-2xl p-12 rounded-3xl text-center max-w-md">
            <AlertOctagon size={56} className="text-red-500 mx-auto mb-4 animate-bounce"/>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Fullscreen Required</h2>
            <p className="text-gray-500 mb-8 text-sm">Return to fullscreen immediately to continue your assessment.</p>
            <button
              onClick={async () => { try { await document.documentElement.requestFullscreen(); setIsBlurred(false); } catch { toast.error('Failed.'); } }}
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm"
            >
              Return to Exam →
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Camera ── */}
      <FloatingCamera active={cameraActive} streamRef={cameraStreamRef} videoRef={videoRef}/>

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-8 z-20 shadow-sm shrink-0">
        <div className="px-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <Lock size={10} className="text-white"/>
            </div>
            <span className="font-extrabold text-sm text-gray-800">HireAI Exam</span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono truncate mt-1">{data?.applications?.full_name}</p>
        </div>

        <div className="px-5 space-y-1.5 flex-1">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pipeline</p>
          {[
            { id: 'welcome',   label: 'System Check',  icon: CheckCircle2, show: true },
            { id: 'interview', label: 'AI Interview',   icon: Video,        show: !!config?.interview?.enabled },
            { id: 'coding',    label: 'Coding Lab',     icon: Code2,        show: !!config?.coding?.enabled },
            { id: 'complete',  label: 'Completed',      icon: CheckCircle2, show: true },
          ].filter(s => s.show).map(s => {
            const order    = ['welcome', 'interview', 'coding', 'complete'];
            const isActive = stage === s.id;
            const isDone   = order.indexOf(stage) > order.indexOf(s.id);
            return (
              <div key={s.id} className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-700' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                <s.icon size={13}/> {s.label}
                {isDone && <CheckCircle2 size={11} className="ml-auto text-green-400"/>}
              </div>
            );
          })}

          {warnings > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-red-600 text-xs font-bold animate-pulse">
              <AlertOctagon size={12}/> {warnings}/{warningLimit} Warnings
            </div>
          )}

          <div className="mt-4 space-y-2">
            {stage === 'interview' && interviewPhase === 'think' && (
              <div className={`p-3 rounded-xl border text-center font-mono font-bold ${thinkTimer.isLow ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <p className="text-[8px] uppercase text-gray-400 mb-0.5">Prep Time</p>
                <p className="text-lg">{thinkTimer.mins}:{thinkTimer.secs}</p>
              </div>
            )}
            {stage === 'interview' && interviewPhase === 'speak' && (
              <div className={`p-3 rounded-xl border text-center font-mono font-bold ${speakTimer.isLow ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <p className="text-[8px] uppercase text-gray-400 mb-0.5 flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"/> REC</p>
                <p className="text-lg">{speakTimer.mins}:{speakTimer.secs}</p>
              </div>
            )}
            {stage === 'coding' && (
              <div className={`p-3 rounded-xl border text-center font-mono font-bold ${codingTimer.isLow ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <p className="text-[8px] uppercase text-gray-400 mb-0.5 flex items-center justify-center gap-1"><Clock size={8}/> Time Left</p>
                <p className="text-xl">{codingTimer.mins}:{codingTimer.secs}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pt-4 border-t border-gray-100">
          <p className="text-[9px] text-gray-300 font-mono">🤖 LLM-Eval Mode · No Execution</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ═══ WELCOME ═══════════════════════════════════════════════════════ */}
        {stage === 'welcome' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-xl w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-10 space-y-8">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Secure Exam Room</p>
                <h1 className="text-3xl font-extrabold text-gray-900">{data?.applications?.jobs?.title || 'Technical Assessment'}</h1>
                <p className="text-gray-400 mt-1 text-sm">{data?.applications?.jobs?.company_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ icon: Camera, label: 'Camera', key: 'camera' }, { icon: Mic, label: 'Microphone', key: 'mic' }].map(({ icon: Icon, label, key }) => (
                  <div key={key} className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 text-center transition-all ${permissions[key] === true ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${permissions[key] === true ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={20}/>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{label}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 text-gray-400">
                        {permissions[key] === true ? '✓ Ready' : permissions[key] === false ? '✗ Denied' : 'Not checked'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(!permissions.camera || !permissions.mic) ? (
                <button onClick={runSystemCheck} className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl flex items-center justify-center gap-3 text-sm">
                  <Settings size={16}/> Check Camera & Microphone
                </button>
              ) : (
                <button disabled={submitting} onClick={handleNextStage} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-sm">
                  Enter Exam Room <ArrowRight size={16}/>
                </button>
              )}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-700">
                <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
                <p>This exam is <strong>fullscreen-enforced and AI-proctored</strong> with face detection. Tab switching, exiting fullscreen, and multiple faces in frame will be recorded and may terminate your session.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ INTERVIEW ══════════════════════════════════════════════════════ */}
        {stage === 'interview' && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{
                  color: interviewPhase === 'think' ? '#2563eb' : interviewPhase === 'edit' ? '#d97706' : '#16a34a'
                }}>
                  {interviewPhase === 'think' ? '🤔 Preparation Phase'
                    : interviewPhase === 'edit' ? '✏️ Edit Your Answer'
                    : '🎤 Recording Phase'}
                </p>
                <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  Question {questionIndex + 1} <span className="text-gray-300 font-light">/</span> {config?.interview?.questions || 1}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {interviewPhase === 'think' ? (
                  <button onClick={() => { thinkTimer.stop(); setInterviewPhase('speak'); }}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 flex items-center gap-2">
                    <Play size={12}/> Start Answering
                  </button>
                ) : interviewPhase === 'speak' ? (
                  <button onClick={() => { speakTimer.stop(); setInterviewPhase('edit'); }}
                    className="px-5 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-400 flex items-center gap-2">
                    <Edit3 size={12}/> Done Speaking → Edit
                  </button>
                ) : (
                  <button disabled={submitting || !transcript.trim()} onClick={handlePhaseComplete}
                    className="px-6 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500 flex items-center gap-2 disabled:opacity-50">
                    <Save size={12}/> {questionIndex + 1 < (config?.interview?.questions || 1) ? 'Submit & Next →' : 'Finish Interview'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-5">
              <p className="text-lg font-semibold text-gray-800 leading-relaxed">
                {currentQ_I?.question || 'Describe a difficult technical challenge and how you resolved it.'}
              </p>
              {interviewPhase === 'think' && (
                <p className="text-sm text-blue-400 mt-4 flex items-center gap-2">
                  <Clock size={13}/> Think time: <strong>{thinkTimer.seconds}s</strong> remaining. Recording begins when you click "Start Answering".
                </p>
              )}
              {interviewPhase === 'speak' && (
                <p className="text-sm text-green-600 mt-4 flex items-center gap-2">
                  <Clock size={13}/> Answer time: <strong>{speakTimer.seconds}s</strong> remaining.
                </p>
              )}
              {interviewPhase === 'edit' && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm text-amber-600 flex items-center gap-1.5">
                    <Clock size={13}/> Edit time: <strong>{editTimer.seconds}s</strong> remaining — review and correct your answer below.
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              {stt.isListening && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/> Live STT
                </div>
              )}
              {!stt.isSupported && interviewPhase === 'speak' && (
                <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <MicOff size={10}/> STT not supported — type your answer
                </div>
              )}
              <textarea
                className={`w-full h-full min-h-[260px] bg-white border-2 rounded-2xl p-6 text-base text-gray-800 outline-none resize-none font-medium leading-relaxed shadow-sm pb-16 transition-colors ${
                  interviewPhase === 'speak' ? 'border-green-300 focus:border-green-500' :
                  interviewPhase === 'edit'  ? 'border-amber-300 focus:border-amber-500' :
                                              'border-gray-100 blur-sm pointer-events-none'
                }`}
                placeholder={
                  interviewPhase === 'think' ? 'Transcript locked during preparation...' :
                  interviewPhase === 'edit'  ? 'Edit and correct your answer before submitting...' :
                  'Your answer will appear here as you speak. You can also type...'
                }
                value={transcript}
                onChange={e => { setTranscript(e.target.value); setInterimText(''); }}
                readOnly={interviewPhase === 'think'}
              />
              {interimText && (
                <div className="absolute bottom-6 left-6 right-6 p-3 bg-blue-50/90 text-blue-800 text-sm italic rounded-xl border border-blue-100 pointer-events-none animate-pulse">
                  Listening: {interimText}
                </div>
              )}
            </div>

            {interviewPhase === 'speak' && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <Edit3 size={11}/> You can edit the transcribed answer before submitting.
                {stt.isListening && (
                  <button onClick={stt.stop} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
                    <StopCircle size={11}/> Stop Recording
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ CODING ═════════════════════════════════════════════════════════ */}
        {stage === 'coding' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <Code2 size={15} className="text-blue-600"/>
                <span className="font-extrabold text-sm text-gray-800">Coding Lab</span>
                <span className="text-xs text-gray-400">Challenge {codingIndex + 1} / {codingQuestions.length}</span>
                <div className="flex gap-1.5 ml-2">
                  {codingQuestions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === codingIndex ? 'bg-blue-600' : i < codingIndex ? 'bg-green-400' : 'bg-gray-200'}`}/>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Run limit counter */}
                {currentQ_C && (() => {
                  const rl = runsLeft[currentQ_C.id] ?? MAX_RUNS;
                  return (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      rl === 0 ? 'bg-red-50 text-red-600 border-red-200' :
                      rl === 1 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {rl === 0 ? '🚫 Runs Exhausted' : `Runs left: ${rl} / ${MAX_RUNS}`}
                    </span>
                  );
                })()}
                <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                  className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
                <button disabled={submitting} onClick={handleNextStage}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50">
                  <Save size={12}/>
                  {codingIndex + 1 < codingQuestions.length ? 'Submit & Next →' : 'Final Submit'}
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Problem Panel */}
              <div className="w-[36%] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      currentQ_C?.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      currentQ_C?.difficulty === 'hard' ? 'bg-red-100 text-red-700'     :
                      'bg-amber-100 text-amber-700'}`}>
                      {currentQ_C?.difficulty || 'Medium'}
                    </span>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-2 leading-tight">{currentQ_C?.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{currentQ_C?.description}</p>

                  {currentQ_C?.public_testcases?.[0] && (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 font-mono text-xs space-y-2">
                      <p className="font-bold text-gray-400 uppercase text-[9px]">Example</p>
                      <div><p className="text-gray-400 mb-0.5">Input:</p><p className="text-blue-700 bg-blue-50 px-2 py-1 rounded">{JSON.stringify(currentQ_C.public_testcases[0].input)}</p></div>
                      <div><p className="text-gray-400 mb-0.5">Output:</p><p className="text-green-700 bg-green-50 px-2 py-1 rounded">{JSON.stringify(currentQ_C.public_testcases[0].output)}</p></div>
                    </div>
                  )}

                  {(language === 'java' || language === 'cpp') && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                      <p className="font-bold mb-1">💡 {language === 'java' ? 'Java' : 'C++'} Hint</p>
                      <p>{language === 'java'
                        ? 'Name your method "solve()". The runner auto-calls it via reflection. Return the answer — don\'t print it.'
                        : 'Name your function "solve()". Return the answer value. Use cin to read stdin if needed.'}</p>
                    </div>
                  )}
                </div>

                {/* Console */}
                <div className="border-t border-gray-100 bg-gray-900 flex flex-col" style={{ height: '240px' }}>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Terminal size={10} className="text-green-400"/> LLM Trace Console
                    </span>
                    {(() => {
                      const rl = runsLeft[currentQ_C?.id] ?? MAX_RUNS;
                      const exhausted = rl <= 0;
                      return (
                        <button
                          disabled={runningCode || exhausted}
                          onClick={runRealCode}
                          title={exhausted ? 'Run limit reached. Submit your solution.' : 'Run against public test cases'}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            exhausted
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          } disabled:opacity-60`}>
                          {runningCode ? <Settings size={10} className="animate-spin"/> : <Play size={10}/>}
                          {runningCode ? 'Evaluating...' : exhausted ? 'Limit Reached' : 'Run Code'}
                        </button>
                      );
                    })()}
                  </div>
                  {/* Limit warning banner */}
                  {(runsLeft[currentQ_C?.id] ?? MAX_RUNS) <= 0 && (
                    <div className="px-4 py-2 bg-amber-900/40 border-b border-amber-700/30 text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={10}/> Run limit reached. You can only submit now.
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] text-green-300 whitespace-pre-wrap leading-relaxed">
                    {consoleOutput || <span className="text-gray-600">Click "Run Code" to test your solution against public cases via LLM trace...</span>}
                  </div>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden">
                <div className="h-8 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center px-4">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {language === 'python' ? 'solution.py' : language === 'javascript' ? 'solution.js' : language === 'java' ? 'Main.java' : 'solution.cpp'}
                  </span>
                </div>
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={codes[currentQ_C?.id]?.[language] || ''}
                  onChange={updateCurrentCode}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    fontLigatures: true,
                    lineNumbers: 'on',
                    padding: { top: 14 },
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    bracketPairColorization: { enabled: true },
                    scrollbar: { vertical: 'visible', useShadows: false, verticalScrollbarSize: 6 },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ COMPLETE ═══════════════════════════════════════════════════════ */}
        {stage === 'complete' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-12 text-center max-w-md w-full">
              <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={44} className="text-green-500"/>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Assessment Complete!</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">Your responses and proctoring data have been securely transmitted. The recruiter will contact you via email with next steps.</p>
              <div className="flex items-center justify-center gap-2 text-gray-300 text-xs font-mono">
                <Lock size={11}/> Session Secured & Terminated
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AssessmentEngine;
