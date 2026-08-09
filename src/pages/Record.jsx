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
import { computeMetrics, annotateTranscript } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
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
  const [isPaused, setIsPaused] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0); // 0 = freeform
  const [elapsed, setElapsed] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showNotice, setShowNotice] = useState('');
  const [activePreset, setActivePreset] = useState(4);

  const timerRef = useRef(null);
  const finalTextRef = useRef('');
  const elapsedRef = useRef(0);
  const liveRef = useRef(null);

  const activeTopicDisplay = customContext || selectedContext || 'Free Talk Session';

  // Check Speech API support
  useEffect(() => {
    if (!isSpeechSupported()) {
      setSpeechSupported(false);
      setShowNotice('⚠ Speech recognition requires Chrome or Edge browser.');
    }
    return () => destroyRecognition();
  }, []);

  // Setup recognition
  const setupRecognition = useCallback(() => {
    createRecognition({
      onResult: ({ finalText: fin, interimText: interim }) => {
        finalTextRef.current = fin;
        setFinalText(fin);
        setInterimText(interim);
      },
      onError: (error) => {
        if (error === 'not-allowed') {
          setShowNotice('⚠ Microphone access denied. Please allow it in your browser settings.');
        }
      },
      onEnd: () => {},
    });
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;
          if (timerSecs > 0 && next >= timerSecs) {
            handleStop();
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused, timerSecs]);

  // Scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [finalText, interimText]);

  // Start recording from scratch
  const handleStart = () => {
    setIsRecording(true);
    setIsPaused(false);
    setFinalText('');
    setInterimText('');
    setElapsed(0);
    finalTextRef.current = '';
    elapsedRef.current = 0;

    setupRecognition();
    startListening();
  };

  // Pause speech recognition
  const handlePause = () => {
    stopListening();
    setIsPaused(true);
  };

  // Resume speech recognition
  const handleResume = () => {
    setIsPaused(false);
    startListening();
  };

  // Reset/Clear recording
  const handleReset = () => {
    stopListening();
    setIsRecording(false);
    setIsPaused(false);
    setFinalText('');
    setInterimText('');
    setElapsed(0);
    finalTextRef.current = '';
    elapsedRef.current = 0;
  };

  // Stop recording & finish session
  const handleStop = useCallback(async () => {
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    stopListening();

    const raw = finalTextRef.current.trim();
    const dur = elapsedRef.current || 1;

    setProcessing(true);
    setProcessingStep(0);
    navigate('/processing');

    setProcessingStep(1);
    await delay(700);

    setProcessingStep(2);
    const metrics = computeMetrics(raw, dur);
    await delay(700);

    setProcessingStep(3);
    const ctx = customContext || selectedContext || 'Free Talk';
    let polished = '';
    if (raw.length > 15) {
      polished = await polishTranscript(raw, ctx);
    } else {
      polished = 'Your recording was too short. Try speaking for at least 15–20 seconds.';
    }
    await delay(600);

    setProcessingStep(4);
    await delay(400);

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

  const displayTime = () => {
    if (timerSecs > 0) {
      const left = Math.max(0, timerSecs - elapsed);
      return fmt(left);
    }
    return fmt(elapsed);
  };

  const wordCount = (finalText + ' ' + interimText).trim().split(/\s+/).filter(Boolean).length;
  const isWarning = timerSecs > 0 && elapsed >= timerSecs * 0.8 && elapsed < timerSecs;

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-6 max-[768px]:px-4 pt-6 max-[768px]:pt-4 pb-16">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/context')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Exit & Back to Setup
        </button>
      </div>

      {/* Speech Notice */}
      {showNotice && (
        <div className="text-[12px] text-orange bg-orange-dim border border-[rgba(204,159,96,0.2)] px-4 py-2 rounded-lg mb-4 text-center">
          {showNotice}
        </div>
      )}

      {/* 2-Column Split Dashboard Layout */}
      <div className="grid grid-cols-[44%_56%] gap-6 max-[900px]:grid-cols-1 items-start">
        {/* LEFT COLUMN: Topic, Timer & Recording Controls */}
        <div className="flex flex-col items-center text-center bg-surface border border-border-md rounded-2xl p-6 max-[768px]:p-5 shadow-xl">
          {/* Active Topic Banner */}
          <div className="w-full mb-5 p-4 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent font-medium mb-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse inline-block" />
              Active Topic
            </div>
            <h2 className="font-serif text-[18px] sm:text-[20px] text-text font-normal leading-[1.35]">
              "{activeTopicDisplay}"
            </h2>
          </div>

          {/* Timer Presets */}
          {!isRecording && (
            <div className="flex gap-2 mb-5 justify-center flex-wrap">
              {TIMER_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setTimerSecs(p.secs);
                    setActivePreset(i);
                  }}
                  className={`text-[12px] px-3.5 py-1 border rounded-full cursor-pointer bg-transparent font-sans transition-all duration-[180ms] ${
                    activePreset === i
                      ? 'border-accent-border text-accent bg-accent-dim font-medium'
                      : 'border-border-md text-text3 hover:border-border-hi hover:text-text'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Big Display Timer */}
          <div
            onClick={() => setTimerHidden(!timerHidden)}
            className={`font-serif text-[68px] sm:text-[76px] leading-none tracking-[-0.03em] cursor-pointer select-none transition-all duration-300 mb-1 ${
              isWarning ? 'text-orange animate-pulse' : 'text-text'
            } ${timerHidden ? 'opacity-[0.08]' : ''}`}
          >
            {displayTime()}
          </div>
          <div
            onClick={() => setTimerHidden(!timerHidden)}
            className="text-[10px] text-text3 tracking-[0.14em] uppercase cursor-pointer mb-5"
          >
            tap to {timerHidden ? 'show' : 'hide'} timer
          </div>

          {/* Audio Waveform */}
          <div className="mb-5 w-full flex flex-col items-center">
            <WaveForm isActive={isRecording && !isPaused} />
          </div>

          {/* Mic & Control Actions */}
          <div className="flex flex-col items-center gap-3 w-full">
            {!isRecording ? (
              <button
                onClick={handleStart}
                disabled={!speechSupported}
                className={`w-20 h-20 rounded-full border-none cursor-pointer flex items-center justify-center transition-all duration-300 relative shadow-[0_0_40px_rgba(223,200,122,0.25)] hover:shadow-[0_0_60px_rgba(223,200,122,0.45)] hover:scale-105 active:scale-95 bg-accent ${
                  !speechSupported ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e0e0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2.5 flex-wrap w-full">
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md flex-1 min-w-[120px]"
                  >
                    ▶ Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="inline-flex items-center justify-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-amber-500/25 active:scale-95 flex-1 min-w-[110px]"
                  >
                    ⏸ Pause
                  </button>
                )}

                <button
                  onClick={handleStop}
                  className="inline-flex items-center justify-center gap-2 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-red-500/30 active:scale-95 shadow-md flex-1 min-w-[140px]"
                >
                  ⏹ Finish & Analyze →
                </button>

                <button
                  onClick={handleReset}
                  title="Discard & Reset"
                  className="text-[13px] text-text3 hover:text-text bg-surface border border-border p-3 rounded-xl cursor-pointer transition-all"
                >
                  🔄
                </button>
              </div>
            )}

            <div className="text-[12px] text-text3">
              {isRecording
                ? isPaused
                  ? 'Recording paused — click Resume or Finish'
                  : 'Recording in progress... speak freely'
                : 'Tap the mic to start your speech session'}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Spoken Transcript & Streaming Box */}
        <div className="bg-surface border border-border-md rounded-2xl p-6 max-[768px]:p-5 shadow-xl flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Live Spoken Transcript</span>
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-green animate-ping inline-block" />
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[12px] font-mono text-text3">
                <span>Words: <strong className="text-text">{wordCount}</strong></span>
                <span>·</span>
                <span>Time: <strong className="text-text">{fmt(elapsed)}</strong></span>
              </div>
            </div>

            <div
              ref={liveRef}
              className="font-sans text-[15px] sm:text-[16px] leading-[1.85] text-text2 italic text-left min-h-[220px] max-h-[360px] overflow-y-auto pr-1"
            >
              {finalText || interimText ? (
                <>
                  <span className="text-text font-normal">{finalText}</span>
                  <span className="text-text3"> {interimText}</span>
                </>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-text3 italic">
                  <span className="text-[28px] mb-2 opacity-50">🎙️</span>
                  <span>Your live spoken words will stream here in real-time as you talk.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/40 text-[11px] sm:text-[12px] text-text3 flex items-center justify-between">
            <span>Automatic filler word detection active</span>
            <span>English / Hindi Auto-detected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
