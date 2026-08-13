import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { createRecognition, isSpeechSupported, startListening, stopListening, destroyRecognition } from '../lib/speechEngine';
import { computeMetrics, annotateTranscript, checkGrammarWithLanguageTool } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';
import WaveForm from '../components/WaveForm';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function ScriptRecord() {
  const navigate = useNavigate();

  const scriptText = useSessionStore((s) => s.scriptText);
  const scriptTitle = useSessionStore((s) => s.scriptTitle);
  const scriptPaceWpm = useSessionStore((s) => s.scriptPaceWpm);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);
  const liveRef = useRef(null);
  const teleprompterRef = useRef(null);

  const words = (scriptText || '').trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  useEffect(() => {
    if (!scriptText || !scriptText.trim()) {
      navigate('/script-setup');
    }
  }, [scriptText, navigate]);

  useEffect(() => {
    createRecognition({
      onResult: ({ finalText, interimText }) => {
        setTranscript(finalText);
        setInterim(interimText || '');
      },
      onError: (err) => console.warn('Script speech error:', err),
    });
    return () => destroyRecognition();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && teleprompterRef.current) {
      const scrollSpeed = (scriptPaceWpm / 60) * 8;
      teleprompterRef.current.scrollTop += scrollSpeed * 0.1;
    }
  }, [elapsed, isRecording, scriptPaceWpm]);

  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setIsRecording(true);
    startListening();
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startListening();
    }
  };

  const handleFinishScript = async () => {
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
    const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);

    setProcessing(true);
    setProcessingStep(1);
    navigate('/processing');

    await delay(600);
    setProcessingStep(2);
    await delay(600);

    setProcessingStep(3);
    const ctx = `Script Rehearsal: ${scriptTitle || 'Monologue'}`;
    let polishResult = { polished: '', masterScript: '', coachingTips: [], structuralMapping: null, strongestPoint: null };
    if (fullTranscript.length > 15) {
      polishResult = await polishTranscript(fullTranscript, ctx);
    } else {
      polishResult = { polished: fullTranscript, masterScript: '', coachingTips: [], structuralMapping: null, strongestPoint: null };
    }

    await delay(500);
    setProcessingStep(4);
    await delay(400);

    addSession({
      context: ctx,
      sessionType: 'script',
      rawTranscript: fullTranscript,
      annotatedTranscript: annotateTranscript(fullTranscript, grammarCheck.matches),
      polishedScript: typeof polishResult === 'string' ? polishResult : (polishResult.polished || fullTranscript),
      masterScript: scriptText,
      coachingTips: polishResult.coachingTips || [],
      structuralMapping: polishResult.structuralMapping || null,
      strongestPoint: polishResult.strongestPoint || null,
      durationSecs: duration,
      metrics,
    });

    setProcessing(false);
    navigate('/results');
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-16 max-[768px]:px-5">
      <div className="grid grid-cols-[55%_45%] gap-8 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-5 bg-surface border border-border-md rounded-2xl p-7 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
              📜 Teleprompter · {scriptTitle || 'Script Rehearsal'} ({scriptPaceWpm} WPM)
            </span>
            <span className="font-mono text-[13px] text-text3">⏱ {fmtTime(elapsed)}</span>
          </div>

          <div
            ref={teleprompterRef}
            className="p-7 bg-[#0e1412] border border-accent/30 rounded-2xl max-h-[380px] overflow-y-auto leading-[1.9] font-sans text-[17px] text-[#f4e8d6]"
          >
            {scriptText}
          </div>

          <div className="flex items-center gap-3 pt-2">
            {!isRecording && !transcript ? (
              <button
                onClick={handleStart}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
              >
                🎙 Start Teleprompter Rehearsal
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleRecord}
                  className={`flex-1 inline-flex items-center justify-center gap-2 border rounded-xl px-4 py-3 font-sans text-[13px] font-medium transition-all cursor-pointer ${
                    isRecording ? 'bg-red-500/10 text-red-400 border-red-500/40' : 'bg-surface text-text border-border-md'
                  }`}
                >
                  {isRecording ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  onClick={handleFinishScript}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
                >
                  🏁 Finish & See Results →
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Audio Transcript</span>
                {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />}
              </div>
              {isRecording && <WaveForm />}
            </div>

            <div
              ref={liveRef}
              className="font-sans text-[16px] leading-[1.85] text-text2 italic text-left min-h-[320px] max-h-[380px] overflow-y-auto pr-2"
            >
              {transcript || interim ? (
                <>
                  <span className="text-text font-normal">{transcript}</span>
                  <span className="text-text3"> {interim}</span>
                </>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center text-text3 italic">
                  <span className="text-[32px] mb-2 opacity-50">📜</span>
                  <span>Read the teleprompter script aloud to practice pace & clarity.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
