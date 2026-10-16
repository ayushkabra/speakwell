import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { createRecognition, isSpeechSupported, startListening, stopListening, destroyRecognition } from '../lib/speechEngine';
import { computeMetrics, annotateTranscript, checkGrammarWithLanguageTool } from '../lib/metricsEngine';
import { polishTranscript, fetchLadderQuestion } from '../lib/apiClient';
import WaveForm from '../components/WaveForm';
import CountdownClock from '../components/CountdownClock';
import {
  playCountdownPing,
  playCompletionChime,
  playStartTone,
  isSoundMuted,
  setSoundMuted,
} from '../lib/soundEffects';

const LADDER_TIMER_PRESETS = [
  { label: '30s', secs: 30 },
  { label: '45s', secs: 45 },
  { label: '60s', secs: 60 },
  { label: '90s', secs: 90 },
  { label: '∞ Free', secs: 0 },
];

const getDefaultLevelSecs = (lvl) => {
  if (lvl === 1) return 30;
  if (lvl === 2) return 45;
  if (lvl === 3) return 60;
  if (lvl === 4) return 90;
  return 120;
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function LadderRecord() {
  const navigate = useNavigate();

  const ladderDomain = useSessionStore((s) => s.ladderDomain);
  const ladderLevel = useSessionStore((s) => s.ladderLevel);
  const setLadderLevel = useSessionStore((s) => s.setLadderLevel);
  const addLadderAnswer = useSessionStore((s) => s.addLadderAnswer);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [targetSecs, setTargetSecs] = useState(() => getDefaultLevelSecs(ladderLevel || 1));
  const [timerHidden, setTimerHidden] = useState(false);
  const [isMuted, setIsMuted] = useState(() => isSoundMuted());
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('speakwell_focus_mode') === 'true');

  const timerRef = useRef(null);
  const liveRef = useRef(null);

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
    setTargetSecs(getDefaultLevelSecs(ladderLevel));
  }, [ladderLevel]);

  useEffect(() => {
    if (!ladderDomain) {
      navigate('/ladder-setup');
      return;
    }

    let isMounted = true;
    async function loadQuestion() {
      setLoadingQuestion(true);
      const state = useSessionStore.getState();
      const prevQ = state.ladderAnswers.map((a) => a.questionText);
      const qData = await fetchLadderQuestion(ladderDomain, ladderLevel, prevQ);

      if (isMounted) {
        if (qData && qData.questionText) {
          setCurrentQuestion(qData);
        } else {
          setCurrentQuestion({
            questionText: `Level ${ladderLevel}: Address the core trade-offs and structural challenges in ${ladderDomain}.`,
            hint: 'Structure your argument with clear thesis points and real-world examples.',
          });
        }
        setLoadingQuestion(false);
      }
    }

    loadQuestion();
    return () => { isMounted = false; };
  }, [ladderDomain, ladderLevel, navigate]);

  useEffect(() => {
    createRecognition({
      onResult: ({ finalText, interimText }) => {
        setTranscript(finalText);
        setInterim(interimText || '');
      },
      onError: (err) => console.warn('Ladder speech error:', err),
    });
    return () => destroyRecognition();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (targetSecs > 0) {
            const remaining = targetSecs - next;
            if (remaining === 10 || (remaining <= 3 && remaining > 0)) {
              playCountdownPing(remaining <= 3 ? 880 : 660);
            }
            if (remaining === 0) {
              playCompletionChime();
            }
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, targetSecs]);

  useEffect(() => {
    if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight;
  }, [transcript, interim]);

  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setIsRecording(true);
    playStartTone();
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

  const handleNextLevel = async () => {
    playCompletionChime();
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
    const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);

    addLadderAnswer({
      level: ladderLevel,
      questionText: currentQuestion?.questionText || `Level ${ladderLevel}`,
      transcript: fullTranscript || '(No response)',
      durationSecs: duration,
      metrics,
    });

    setLadderLevel(ladderLevel + 1);
    setTranscript('');
    setInterim('');
    setElapsed(0);
  };

  const handleFinishLadder = async () => {
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
    const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);

    addLadderAnswer({
      level: ladderLevel,
      questionText: currentQuestion?.questionText || `Level ${ladderLevel}`,
      transcript: fullTranscript || '(No response)',
      durationSecs: duration,
      metrics,
    });

    const state = useSessionStore.getState();
    const allAnswers = state.ladderAnswers;

    setProcessing(true);
    setProcessingStep(1);
    navigate('/processing');

    await delay(600);
    setProcessingStep(2);

    const combinedTranscript = allAnswers
      .map((a) => `Level ${a.level} (${a.questionText}): ${a.transcript}`)
      .join('\n\n');
    const totalSecs = allAnswers.reduce((sum, a) => sum + a.durationSecs, 0);

    const overallGrammar = await checkGrammarWithLanguageTool(
      allAnswers.map((a) => a.transcript).join(' ')
    );
    const overallMetrics = computeMetrics(
      allAnswers.map((a) => a.transcript).join(' '),
      totalSecs,
      overallGrammar.matches
    );

    const avgOverall = Math.round(
      allAnswers.reduce((sum, a) => sum + (a.metrics?.overall || 50), 0) / allAnswers.length
    );
    overallMetrics.overall = avgOverall;

    await delay(600);
    setProcessingStep(3);

    const ctx = `Topic Ladder (${ladderDomain}): Reached Level ${ladderLevel}`;
    let polishResult = { polished: '', masterScript: '', coachingTips: [], structuralMapping: null, strongestPoint: null };
    if (combinedTranscript.length > 15) {
      polishResult = await polishTranscript(combinedTranscript, ctx);
    } else {
      polishResult = { polished: combinedTranscript, masterScript: '', coachingTips: [], structuralMapping: null, strongestPoint: null };
    }

    await delay(500);
    setProcessingStep(4);
    await delay(400);

    addSession({
      context: ctx,
      sessionType: 'ladder',
      drillAnswers: allAnswers,
      rawTranscript: combinedTranscript,
      annotatedTranscript: annotateTranscript(combinedTranscript, overallGrammar.matches),
      polishedScript: typeof polishResult === 'string' ? polishResult : (polishResult.polished || combinedTranscript),
      masterScript: polishResult.masterScript || '',
      coachingTips: polishResult.coachingTips || [],
      structuralMapping: polishResult.structuralMapping || null,
      strongestPoint: polishResult.strongestPoint || null,
      durationSecs: totalSecs,
      metrics: overallMetrics,
    });

    setProcessing(false);
    navigate('/results');
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const wordCount = (transcript + ' ' + interim).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-16 max-[768px]:px-5">
      <div className="grid grid-cols-[44%_56%] gap-8 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-5 bg-surface border border-border-md rounded-2xl p-7 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
              Level {ladderLevel} · {ladderDomain}
            </span>
            <span className="font-mono text-[13px] text-text3">⏱ {fmtTime(elapsed)}</span>
          </div>

          <div className="p-6 bg-surface2/60 border border-border rounded-xl">
            {loadingQuestion ? (
              <div className="py-8 text-center text-text3 italic">Generating Level {ladderLevel} topic challenge...</div>
            ) : (
              <>
                <div className="text-[10px] tracking-[0.2em] uppercase text-accent mb-1 font-semibold">
                  Progressive Question Level {ladderLevel}
                </div>
                <h2 className="font-serif text-[22px] leading-[1.35] text-text font-normal mb-2">
                  "{currentQuestion?.questionText}"
                </h2>
                {currentQuestion?.hint && (
                  <p className="text-[12px] text-text3 italic leading-[1.5]">💡 {currentQuestion.hint}</p>
                )}
              </>
            )}
          </div>

          {!isRecording && (
            <div className="flex gap-2 justify-center flex-wrap">
              {LADDER_TIMER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTargetSecs(p.secs)}
                  className={`text-[12px] px-3.5 py-1 border rounded-full cursor-pointer bg-transparent font-sans transition-all duration-[180ms] ${
                    targetSecs === p.secs
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
            timeRemaining={targetSecs > 0 ? Math.max(0, targetSecs - elapsed) : elapsed}
            totalSecs={targetSecs}
            isRecording={isRecording}
            isPaused={false}
            isTimerHidden={timerHidden}
            onToggleHidden={() => setTimerHidden(!timerHidden)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            size={160}
          />

          {targetSecs > 0 && targetSecs - elapsed <= 0 && isRecording && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-[12px] leading-[1.5] text-center">
              ⏱ <strong>Target level pace reached!</strong> Wrap up and ascend to the next level.
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            {!isRecording && !transcript ? (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  onClick={handleStart}
                  disabled={loadingQuestion}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
                >
                  🎙 Start Level {ladderLevel} Answer
                </button>
                <p className="text-[11px] text-text3 text-center leading-[1.4]">
                  Your browser will ask for mic access — tap <strong className="text-text2">Allow</strong> so we can transcribe your answer.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleToggleRecord}
                  className={`flex-1 inline-flex items-center justify-center gap-2 border rounded-xl px-4 py-3 font-sans text-[13px] font-medium transition-all cursor-pointer ${
                    isRecording ? 'bg-red-500/10 text-red-400 border-red-500/40' : 'bg-surface text-text border-border-md'
                  }`}
                >
                  {isRecording ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  onClick={handleNextLevel}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-accent/20 border border-accent/40 text-accent rounded-xl px-4 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-accent/30"
                >
                  🪜 Next Level ({ladderLevel + 1}) →
                </button>
              </div>
            )}

            <button
              onClick={handleFinishLadder}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md mt-1"
            >
              🏁 Finish Ladder Session & See Results →
            </button>
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3 flex-wrap gap-2">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Answer (Level {ladderLevel})</span>
                {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />}
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
                {isRecording && <WaveForm />}
                <span>Words: <strong className="text-text">{wordCount}</strong></span>
              </div>
            </div>

            {focusMode ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-text3">
                <span className="text-[34px] mb-2 animate-pulse">🧘</span>
                <h4 className="text-text font-serif text-[18px] mb-1 font-normal">Focus Mode Active</h4>
                <p className="text-[13px] text-text3 max-w-[320px] leading-[1.6]">
                  Your thoughts for Level {ladderLevel} are recording privately in the background. Speak naturally and confidently!
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
                className="font-sans text-[16px] leading-[1.85] text-text2 italic text-left min-h-[320px] max-h-[380px] overflow-y-auto pr-2"
              >
                {transcript || interim ? (
                  <>
                    <span className="text-text font-normal">{transcript}</span>
                    <span className="text-text3"> {interim}</span>
                  </>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center text-text3 italic">
                    <span className="text-[32px] mb-2 opacity-50">🪜</span>
                    <span>Speak your thoughts to master Level {ladderLevel}.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
