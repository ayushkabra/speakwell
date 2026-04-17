import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import WaveForm from '../components/WaveForm';
import {
  isSpeechSupported,
  createRecognition,
  startListening,
  stopListening,
  destroyRecognition,
} from '../lib/speechEngine';
import { computeMetrics, annotateTranscript, getScoreNote } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

const TIMER_PRESETS = [
  { label: '30s', secs: 30 },
  { label: '1 min', secs: 60 },
  { label: '2 min', secs: 120 },
  { label: '5 min', secs: 300 },
  { label: '∞ Free', secs: 0 },
];

export default function Record() {
  const navigate = useNavigate();

  const selectedContext = useSessionStore((s) => s.selectedContext);
  const customContext = useSessionStore((s) => s.customContext);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0); // 0 = freeform
  const [elapsed, setElapsed] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showNotice, setShowNotice] = useState('');
  const [activePreset, setActivePreset] = useState(4); // "Free" index

  const timerRef = useRef(null);
  const finalTextRef = useRef('');
  const elapsedRef = useRef(0);
  const liveRef = useRef(null);

  // Check Speech API support
  useEffect(() => {
    if (!isSpeechSupported()) {
      setSpeechSupported(false);
      setShowNotice('⚠ Speech recognition requires Chrome or Edge. Microphone access will be requested.');
    }
    return () => destroyRecognition();
  }, []);

  // Setup recognition
  const setupRecognition = useCallback(() => {
    createRecognition({
      onResult: ({ finalText: fin, interimText: interim }) => {
        if (fin) {
          finalTextRef.current += fin;
          setFinalText(finalTextRef.current);
        }
        setInterimText(interim);
      },
      onError: (error) => {
        if (error === 'not-allowed') {
          setShowNotice('⚠ Microphone access denied. Please allow it in your browser settings and reload.');
        }
      },
      onEnd: () => {},
    });
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;
          // Auto-stop if countdown reaches 0
          if (timerSecs > 0 && next >= timerSecs) {
            handleStop();
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, timerSecs]);

  // Scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [finalText, interimText]);

  const handleStart = () => {
    setIsRecording(true);
    setFinalText('');
    setInterimText('');
    setElapsed(0);
    finalTextRef.current = '';
    elapsedRef.current = 0;

    setupRecognition();
    startListening();
  };

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    stopListening();

    const raw = finalTextRef.current.trim();
    const dur = elapsedRef.current;

    // Navigate to processing
    setProcessing(true);
    setProcessingStep(0);
    navigate('/processing');

    // Step 1: Transcribing
    setProcessingStep(1);
    await delay(800);

    // Step 2: Analysing
    setProcessingStep(2);
    const metrics = computeMetrics(raw, dur);
    await delay(800);

    // Step 3: Polished script (Claude API)
    setProcessingStep(3);
    const ctx = selectedContext || 'Free Talk';
    let polished = '';
    if (raw.length > 20) {
      polished = await polishTranscript(raw, customContext || ctx);
    } else {
      polished = 'Your recording was too short. Try speaking for at least 20 seconds.';
    }
    await delay(600);

    // Step 4: Building scorecard
    setProcessingStep(4);
    await delay(500);

    // Save session
    const session = addSession({
      context: ctx,
      customContext: customContext || '',
      durationSecs: dur,
      rawTranscript: raw,
      annotatedTranscript: annotateTranscript(raw),
      polishedScript: polished,
      metrics,
      language: 'Auto-detected',
    });

    setProcessing(false);
    navigate('/results');
  }, [selectedContext, customContext, navigate, addSession, setProcessing, setProcessingStep]);

  const toggleRec = () => {
    isRecording ? handleStop() : handleStart();
  };

  const displayTime = () => {
    if (timerSecs > 0) {
      const left = Math.max(0, timerSecs - elapsed);
      return fmt(left);
    }
    return fmt(elapsed);
  };

  const isWarning = timerSecs > 0 && elapsed >= timerSecs * 0.8 && elapsed < timerSecs;

  return (
    <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 min-h-[calc(100vh-60px)] flex flex-col items-center justify-center text-center gap-0">
      {/* Speech notice */}
      {showNotice && (
        <div className="text-[12px] text-orange bg-orange-dim border border-[rgba(204,159,96,0.2)] px-[18px] py-2 rounded-lg mb-8">
          {showNotice}
        </div>
      )}

      {/* Camera button (V2 disabled) */}
      <div className="mb-7 flex justify-center">
        <button
          className="inline-flex items-center gap-1.5 text-[11px] text-text3 border border-border rounded-full py-[5px] px-3.5 cursor-pointer bg-transparent relative transition-all duration-[180ms] hover:border-border-md"
          title="📷 Camera analysis coming in V2 — body language, eye contact & more."
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          Camera
          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-surface2 border border-border-md rounded-lg px-[5px] py-[1px] text-text3">
            V2
          </span>
        </button>
      </div>

      {/* Timer presets */}
      {!isRecording && (
        <div className="flex gap-2 mb-9 justify-center flex-wrap">
          {TIMER_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => {
                setTimerSecs(p.secs);
                setActivePreset(i);
              }}
              className={`text-[12px] px-4 py-1.5 border rounded-full cursor-pointer bg-transparent font-sans transition-all duration-[180ms]
                ${
                  activePreset === i
                    ? 'border-accent-border text-accent bg-accent-dim'
                    : 'border-border-md text-text3 hover:border-border-hi hover:text-text'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Big timer */}
      <div
        onClick={() => setTimerHidden(!timerHidden)}
        className={`font-serif text-[100px] leading-none tracking-[-0.03em] cursor-pointer select-none transition-all duration-400 mb-1.5
          ${isWarning ? 'text-orange' : 'text-text'}
          ${timerHidden ? 'opacity-[0.07]' : ''}`}
      >
        {displayTime()}
      </div>
      <div
        onClick={() => setTimerHidden(!timerHidden)}
        className="text-[10px] text-text3 tracking-[0.14em] uppercase cursor-pointer mb-10"
      >
        tap to {timerHidden ? 'show' : 'hide'}
      </div>

      {/* Waveform */}
      <WaveForm isActive={isRecording} />

      {/* Live transcript */}
      {(finalText || interimText) && (
        <div
          ref={liveRef}
          className="w-full max-w-[580px] min-h-[60px] max-h-[200px] overflow-y-auto bg-surface border border-border-md rounded-[14px] p-[18px_24px] text-[15px] leading-[1.85] text-text2 italic text-left mb-9"
        >
          <span>{finalText}</span>
          <span className="text-text3">{interimText}</span>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-[11px] text-text3 tracking-[0.14em] uppercase mb-7">
          <span className="w-[7px] h-[7px] rounded-full bg-red animate-blink" />
          <span>Recording</span>
        </div>
      )}

      {/* Mic button */}
      <div className="flex flex-col items-center gap-3.5">
        <button
          onClick={toggleRec}
          disabled={!speechSupported}
          className={`w-20 h-20 rounded-full border-none cursor-pointer flex items-center justify-center transition-all duration-200 relative active:scale-[0.92]
            ${isRecording ? 'bg-red' : 'bg-accent'}
            ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="#0e0e0d" />
              </svg>
              <span className="absolute -inset-3.5 rounded-full border border-[rgba(204,122,100,0.25)] animate-ripple" />
            </>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e0e0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>
        <div className="text-[12px] text-text3">
          {isRecording ? 'Tap to stop' : 'Tap to start recording'}
        </div>
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
