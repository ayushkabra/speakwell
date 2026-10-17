import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import WaveForm from '../components/WaveForm';
import CountdownClock from '../components/CountdownClock';
import {
  isSpeechSupported,
  createRecognition,
  startListening,
  stopListening,
  destroyRecognition,
} from '../lib/speechEngine';
import { computeMetrics, annotateTranscript, checkGrammarWithLanguageTool } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';
import {
  playCountdownPing,
  playCompletionChime,
  playStartTone,
  isSoundMuted,
  setSoundMuted,
} from '../lib/soundEffects';

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
  const location = useLocation();

  const selectedContext = useSessionStore((s) => s.selectedContext);
  const customContext = useSessionStore((s) => s.customContext);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const initialTimer = location.state?.timerSecs ?? 0;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSecs, setTimerSecs] = useState(initialTimer);
  const [elapsed, setElapsed] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showNotice, setShowNotice] = useState('');
  const [activePreset, setActivePreset] = useState(() => {
    const idx = TIMER_PRESETS.findIndex((p) => p.secs === initialTimer);
    return idx !== -1 ? idx : 4;
  });
  // Default to Focus Mode ON (calm screen) unless explicitly turned off
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('speakwell_focus_mode') !== 'false');
  const [wrapUpRemaining, setWrapUpRemaining] = useState(null);

  const timerRef = useRef(null);
  const finalTextRef = useRef('');
  const elapsedRef = useRef(0);
  const liveRef = useRef(null);
  const handleStopRef = useRef();

  const activeTopicDisplay = customContext || selectedContext || 'Free Talk Session';

  useEffect(() => {
    if (!isSpeechSupported()) {
      setSpeechSupported(false);
      setShowNotice('⚠ Speech recognition requires microphone permission.');
    }
    return () => destroyRecognition();
  }, []);

  const setupRecognition = useCallback(() => {
    createRecognition({
      onResult: ({ finalText: fin, interimText: interim }) => {
        if (fin) {
          finalTextRef.current = fin;
          setFinalText(fin);
        }
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

  const handleToggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem('speakwell_focus_mode', next ? 'true' : 'false');
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;

          if (timerSecs > 0) {
            const remaining = timerSecs - next;
            if (remaining === 10 || (remaining <= 3 && remaining > 0)) {
              playCountdownPing(remaining <= 3 ? 880 : 660);
            }
            if (next === timerSecs) {
              playCompletionChime();
              setWrapUpRemaining(5);
            } else if (next > timerSecs) {
              const graceRemaining = (timerSecs + 5) - next;
              if (graceRemaining > 0) {
                setWrapUpRemaining(graceRemaining);
                if (graceRemaining <= 3) {
                  playCountdownPing(880);
                }
              } else {
                setWrapUpRemaining(0);
                clearInterval(timerRef.current);
                handleStopRef.current?.();
              }
            }
          }

          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused, timerSecs]);

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [finalText, interimText]);

  const handleStart = () => {
    setIsRecording(true);
    setIsPaused(false);
    setFinalText('');
    setInterimText('');
    setElapsed(0);
    setWrapUpRemaining(null);
    finalTextRef.current = '';
    elapsedRef.current = 0;

    playStartTone();
    setupRecognition();
    startListening(true);
  };

  const handlePause = () => {
    stopListening();
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startListening(false);
  };

  const handleReset = () => {
    stopListening();
    setIsRecording(false);
    setIsPaused(false);
    setFinalText('');
    setInterimText('');
    setElapsed(0);
    setWrapUpRemaining(null);
    finalTextRef.current = '';
    elapsedRef.current = 0;
  };

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    setIsPaused(false);
    setWrapUpRemaining(null);
    clearInterval(timerRef.current);

    const whisperResult = await stopListening();
    const raw = (whisperResult || finalTextRef.current || '').trim();
    const dur = elapsedRef.current || 1;

    setProcessing(true);
    setProcessingStep(0);
    navigate('/processing');

    await delay(500);

    setProcessingStep(1);
    await delay(500);

    setProcessingStep(2);
    const grammarCheck = await checkGrammarWithLanguageTool(raw);
    const metrics = computeMetrics(raw, dur, grammarCheck.matches);
    await delay(500);

    setProcessingStep(3);
    const ctx = customContext || selectedContext || 'Free Talk';
    let polishResult = { polished: '', masterScript: '', coachingTips: [], structuralMapping: null, strongestPoint: null };
    if (raw.length > 15) {
      polishResult = await polishTranscript(raw, ctx);
    } else {
      polishResult = {
        polished: 'Your recording was too short. Try speaking for at least 15–20 seconds.',
        masterScript: '',
        coachingTips: [],
        structuralMapping: null,
        strongestPoint: null,
      };
    }
    await delay(400);

    setProcessingStep(4);
    await delay(300);

    const session = addSession({
      context: ctx,
      customContext: customContext || '',
      sessionType: 'free',
      durationSecs: dur,
      rawTranscript: raw,
      annotatedTranscript: annotateTranscript(raw, grammarCheck.matches),
      polishedScript: typeof polishResult === 'string' ? polishResult : (polishResult.polished || raw),
      masterScript: polishResult.masterScript || '',
      coachingTips: polishResult.coachingTips || [],
      structuralMapping: polishResult.structuralMapping || null,
      strongestPoint: polishResult.strongestPoint || null,
      metrics,
      language: 'Auto-detected',
    });

    setProcessing(false);
    navigate('/results');
  }, [selectedContext, customContext, navigate, addSession, setProcessing, setProcessingStep]);

  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/context')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Exit & Back to Setup
        </button>
      </div>

      {showNotice && (
        <div className="text-[12px] text-orange bg-orange-dim border border-[rgba(204,159,96,0.2)] px-4 py-2 rounded-lg mb-4 text-center">
          {showNotice}
        </div>
      )}

      <div className="grid grid-cols-[44%_56%] gap-6 max-[900px]:grid-cols-1 items-start">
        <div className="flex flex-col items-center text-center bg-surface border border-border-md rounded-2xl p-6 max-[768px]:p-5 shadow-xl">
          <div className="w-full mb-5 p-4 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent font-medium mb-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse inline-block" />
              Active Topic
            </div>
            <h2 className="font-serif text-[18px] sm:text-[20px] text-text font-normal leading-[1.35]">
              "{activeTopicDisplay}"
            </h2>
          </div>

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

          <CountdownClock
            timeRemaining={timerSecs > 0 ? Math.max(0, timerSecs - elapsed) : elapsed}
            totalSecs={timerSecs}
            isRecording={isRecording}
            isPaused={isPaused}
            isTimerHidden={timerHidden}
            onToggleHidden={() => setTimerHidden(!timerHidden)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {wrapUpRemaining !== null && wrapUpRemaining > 0 && isRecording && !isPaused && (
            <div className="w-full my-2.5 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-[13px] font-medium animate-pulse flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              <span>⏱ Target time reached! Wrapping up in <strong>{wrapUpRemaining}s</strong>...</span>
            </div>
          )}

          <div className="mb-5 w-full flex flex-col items-center">
            <WaveForm isActive={isRecording && !isPaused} />
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            {!isRecording && (
              <p className="text-[11px] text-text3 text-center leading-[1.4] max-w-[260px]">
                Your browser will ask for mic access — tap <strong className="text-text2">Allow</strong> so we can transcribe what you say.
              </p>
            )}
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
                ? wrapUpRemaining !== null && wrapUpRemaining > 0
                  ? `Finishing up thought... ${wrapUpRemaining}s remaining`
                  : isPaused
                  ? 'Recording paused — click Resume or Finish'
                  : 'Recording in progress... speak freely'
                : 'Tap the mic to start your speech session'}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-6 max-[768px]:p-5 shadow-xl flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-3 flex-wrap gap-2">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Live Spoken Transcript</span>
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-green animate-ping inline-block" />
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[12px] font-mono text-text3">
                <button
                  onClick={handleToggleFocusMode}
                  className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer font-sans transition-all flex items-center gap-1.5 ${
                    focusMode
                      ? 'bg-accent/15 border-accent text-accent font-medium shadow-sm'
                      : 'bg-surface2/60 border-border text-text3 hover:text-text'
                  }`}
                  title="Hide live transcript while speaking to focus and reduce anxiety"
                >
                  <span>{focusMode ? '👁️‍🗨️' : '👁️'}</span>
                  <span>{focusMode ? 'Focus Mode ON' : 'Hide Live Text'}</span>
                </button>
                <span>·</span>
                <span>Words: <strong className="text-text">{wordCount}</strong></span>
              </div>
            </div>

            {focusMode ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 text-text3">
                <span className="text-[34px] mb-2 animate-pulse">🧘</span>
                <h4 className="text-text font-serif text-[18px] mb-1 font-normal">Focus Mode Active</h4>
                <p className="text-[13px] text-text3 max-w-[290px] leading-[1.6]">
                  Your speech is recording privately in the background. Speak naturally without self-editing!
                </p>
                <button
                  onClick={handleToggleFocusMode}
                  className="mt-3 text-[12px] text-accent hover:underline bg-transparent border-none cursor-pointer"
                >
                  👁️ Reveal Live Transcript
                </button>
              </div>
            ) : (
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
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border/40 text-[11px] sm:text-[12px] text-text3 flex items-center justify-between">
            <span>Automatic filler word detection active</span>
            <span>LanguageTool Real Grammar Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
