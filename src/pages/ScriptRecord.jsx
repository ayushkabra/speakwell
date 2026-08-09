import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { createRecognition, isSpeechSupported, startListening, stopListening, destroyRecognition } from '../lib/speechEngine';
import { computeMetrics, annotateTranscript } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';
import WaveForm from '../components/WaveForm';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function sanitizeScriptText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\/Contents\s+\d+\s+\d+\s+R/g, '')
    .replace(/\/Resources\s+\d+\s+\d+\s+R/g, '')
    .replace(/%PDF-\d+\.\d+/g, '')
    .replace(/endobj|stream|endstream/g, '')
    .replace(/--- PAGE \d+ ---/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ScriptRecord() {
  const navigate = useNavigate();

  const scriptText = useSessionStore((s) => s.scriptText);
  const scriptTitle = useSessionStore((s) => s.scriptTitle);
  const scriptPaceWpm = useSessionStore((s) => s.scriptPaceWpm) || 140;

  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(20);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const timerRef = useRef(null);
  const teleprompterRef = useRef(null);
  const liveRef = useRef(null);

  const activeScript = sanitizeScriptText(scriptText) || 'Practice reading your speech aloud clearly and deliberately.';
  const activeTitle = scriptTitle || 'Script Rehearsal';

  // Setup speech recognition
  useEffect(() => {
    setHasSpeechSupport(isSpeechSupported());

    createRecognition({
      onResult: ({ finalText, interimText }) => {
        if (finalText) {
          setTranscript((prev) => (prev ? prev + ' ' + finalText : finalText));
        }
        setInterim(interimText || '');
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
      },
    });

    return () => {
      destroyRecognition();
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // Smooth Teleprompter Auto-Scroll
  useEffect(() => {
    if (isRecording && !isPaused && autoScroll && teleprompterRef.current) {
      const el = teleprompterRef.current;
      const scrollInterval = setInterval(() => {
        el.scrollTop += 1;
      }, 120);
      return () => clearInterval(scrollInterval);
    }
  }, [isRecording, isPaused, autoScroll]);

  // Auto scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setIsRecording(true);
    setIsPaused(false);
    startListening();
  };

  const handlePause = () => {
    stopListening();
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startListening();
  };

  const handleReset = () => {
    stopListening();
    setIsRecording(false);
    setIsPaused(false);
    setTranscript('');
    setInterim('');
    setElapsed(0);
    if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
  };

  const handleStop = async () => {
    stopListening();
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);

    const fullTranscript = (transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const metrics = computeMetrics(fullTranscript, duration);

    setProcessing(true);
    setProcessingStep(1);
    navigate('/processing');

    await delay(700);
    setProcessingStep(2);

    let polishResult = { polished: '', structuralMapping: null, strongestPoint: null };
    if (fullTranscript.length > 15) {
      polishResult = await polishTranscript(fullTranscript, `Script Rehearsal: ${activeTitle}`);
    }

    await delay(600);
    setProcessingStep(3);
    await delay(500);
    setProcessingStep(4);
    await delay(400);

    addSession({
      context: `Script Rehearsal: ${activeTitle}`,
      sessionType: 'script',
      rawTranscript: fullTranscript || activeScript,
      annotatedTranscript: annotateTranscript(fullTranscript || activeScript),
      polishedScript: polishResult.polished || fullTranscript || activeScript,
      structuralMapping: polishResult.structuralMapping,
      strongestPoint: polishResult.strongestPoint,
      durationSecs: duration,
      metrics,
    });

    setProcessing(false);
    navigate('/results');
  };

  // Compute live WPM and cadence status
  const wordCount = (transcript + ' ' + interim).trim().split(/\s+/).filter(Boolean).length;
  const currentWpm = elapsed > 3 ? Math.round((wordCount / elapsed) * 60) : 0;

  let paceStatus = { label: 'On Target', color: 'text-green border-green/30 bg-green/10' };
  if (currentWpm > 0) {
    if (currentWpm > scriptPaceWpm + 25) {
      paceStatus = { label: '⚡ Rushing Pace', color: 'text-orange border-orange/30 bg-orange/10' };
    } else if (currentWpm < scriptPaceWpm - 25) {
      paceStatus = { label: '🐢 Slowing Pace', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' };
    }
  }

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-16 max-[768px]:px-5">
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          onClick={() => navigate('/script-setup')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Exit & Back to Setup
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-accent font-medium bg-accent/10 border border-accent/20 px-3 py-1 rounded-full">
            📜 {activeTitle}
          </span>
          <span className="text-[12px] font-mono text-text3 bg-surface border border-border px-3 py-1 rounded-full">
            Target: {scriptPaceWpm} WPM
          </span>
        </div>
      </div>

      {/* 2-Column Split Desktop Rehearsal Room */}
      <div className="grid grid-cols-[50%_50%] gap-8 items-start max-[900px]:grid-cols-1">
        {/* LEFT COLUMN: Teleprompter View with Font & Scroll Controls */}
        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[520px]">
          <div>
            {/* Teleprompter Controls Bar */}
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-accent font-semibold">
                Teleprompter View
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSizePx((s) => Math.max(15, s - 2))}
                  className="text-[12px] px-2.5 py-1 rounded border border-border bg-surface2 text-text hover:border-border-hi cursor-pointer font-mono"
                  title="Decrease font size"
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSizePx((s) => Math.min(32, s + 2))}
                  className="text-[12px] px-2.5 py-1 rounded border border-border bg-surface2 text-text hover:border-border-hi cursor-pointer font-mono"
                  title="Increase font size"
                >
                  A+
                </button>

                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`text-[11px] px-3 py-1 rounded-full border cursor-pointer font-sans transition-all ${
                    autoScroll ? 'bg-accent/20 border-accent text-accent font-medium' : 'bg-surface2 border-border text-text3'
                  }`}
                >
                  {autoScroll ? '📜 Auto-Scroll ON' : '📜 Auto-Scroll OFF'}
                </button>
              </div>
            </div>

            {/* Script Canvas */}
            <div
              ref={teleprompterRef}
              style={{ fontSize: `${fontSizePx}px` }}
              className="font-serif leading-[1.8] text-text whitespace-pre-wrap text-left max-h-[380px] overflow-y-auto pr-3 font-normal"
            >
              {activeScript}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-text3 flex items-center justify-between">
            <span>Tip: Maintain eye contact and follow the cadence</span>
            <span className="font-mono text-accent">{fontSizePx}px font</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Spoken Transcript & Pace Monitor */}
        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[520px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Live Spoken Delivery</span>
                {isRecording && !isPaused && (
                  <span className="w-2.5 h-2.5 rounded-full bg-green animate-ping inline-block" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentWpm > 0 && (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${paceStatus.color}`}>
                    {paceStatus.label} ({currentWpm} WPM)
                  </span>
                )}
                <span className="font-mono text-[13px] text-text bg-surface2 border border-border px-3 py-1 rounded-full">
                  ⏱ {fmtTime(elapsed)}
                </span>
              </div>
            </div>

            {/* Live Transcript Stream */}
            <div
              ref={liveRef}
              className="font-sans text-[16px] leading-[1.85] text-text2 italic text-left min-h-[220px] max-h-[280px] overflow-y-auto pr-2"
            >
              {transcript || interim ? (
                <>
                  <span className="text-text font-normal">{transcript}</span>
                  <span className="text-text3"> {interim}</span>
                </>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-text3 italic">
                  <span className="text-[32px] mb-2 opacity-50">🎙️</span>
                  <span>Tap "Start Rehearsal" and read your script aloud.</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-col gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2.5">
              {!isRecording ? (
                <button
                  onClick={handleStart}
                  disabled={!hasSpeechSupport}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
                >
                  🎙 Start Rehearsal
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={handleResume}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
                    >
                      ▶ Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-amber-500/25 active:scale-95"
                    >
                      ⏸ Pause
                    </button>
                  )}

                  <button
                    onClick={handleStop}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl px-5 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-red-500/30 active:scale-95 shadow-md"
                  >
                    ⏹ Finish & Analyze →
                  </button>

                  <button
                    onClick={handleReset}
                    title="Reset script rehearsal"
                    className="text-[13px] text-text3 hover:text-text bg-surface border border-border p-3 rounded-xl cursor-pointer transition-all"
                  >
                    🔄
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-text3">
              <span>Words Spoken: <strong className="text-text">{wordCount}</strong></span>
              <span>Waveform: <WaveForm isActive={isRecording && !isPaused} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
