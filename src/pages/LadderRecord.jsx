import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { createRecognition, isSpeechSupported, startListening, stopListening, destroyRecognition } from '../lib/speechEngine';
import { computeMetrics, annotateTranscript } from '../lib/metricsEngine';
import { polishTranscript, fetchLadderQuestion } from '../lib/apiClient';
import { getTierMetadata, getLocalFallbackQuestion } from '../lib/ladderGenerator';
import WaveForm from '../components/WaveForm';

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

  const [questionText, setQuestionText] = useState('');
  const [questionHint, setQuestionHint] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const timerRef = useRef(null);
  const liveRef = useRef(null);
  const askedQuestionsRef = useRef([]);

  const tier = getTierMetadata(ladderLevel);

  // Safeguard: Redirect if no domain set
  useEffect(() => {
    if (!ladderDomain) {
      navigate('/ladder-setup');
    }
  }, [ladderDomain, navigate]);

  // Load question for current level
  useEffect(() => {
    let isMounted = true;
    async function loadQuestion() {
      setLoadingQuestion(true);
      setIsRecording(false);
      stopListening();

      // Check if previous answer exists for this level
      const state = useSessionStore.getState();
      const existingAnswer = state.ladderAnswers.find((a) => a.level === ladderLevel);

      if (existingAnswer && existingAnswer.transcript !== '(No response recorded)') {
        setQuestionText(existingAnswer.questionText);
        setTranscript(existingAnswer.transcript);
        setElapsed(existingAnswer.durationSecs || 0);
        setLoadingQuestion(false);
        return;
      }

      setTranscript('');
      setInterim('');
      setElapsed(0);

      // Attempt AI generation first
      const aiData = await fetchLadderQuestion(ladderDomain, ladderLevel, askedQuestionsRef.current);
      
      if (isMounted) {
        if (aiData && aiData.questionText) {
          setQuestionText(aiData.questionText);
          setQuestionHint(aiData.hint || '');
          askedQuestionsRef.current.push(aiData.questionText);
        } else {
          // Fallback to local bank
          const fallback = getLocalFallbackQuestion(ladderDomain, ladderLevel);
          setQuestionText(fallback);
          setQuestionHint('');
          askedQuestionsRef.current.push(fallback);
        }
        setLoadingQuestion(false);
      }
    }

    if (ladderDomain) {
      loadQuestion();
    }

    return () => {
      isMounted = false;
    };
  }, [ladderDomain, ladderLevel]);

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
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // Auto scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  // Start recording
  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setIsRecording(true);
    startListening();
  };

  // Restart recording for current level
  const handleRestartAnswer = () => {
    stopListening();
    setIsRecording(false);
    setTranscript('');
    setInterim('');
    setElapsed(0);
  };

  // Toggle pause/resume
  const handleToggleRecord = () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startListening();
    }
  };

  // Navigate back to Previous Level
  const handlePreviousLevel = () => {
    if (ladderLevel <= 1) return;
    stopListening();
    setIsRecording(false);

    // Save current level answer if any before leaving
    const fullTranscript = (transcript + ' ' + interim).trim();
    if (fullTranscript || elapsed > 0) {
      const duration = elapsed || 1;
      const metrics = computeMetrics(fullTranscript, duration);
      addLadderAnswer({
        level: ladderLevel,
        tierTitle: tier.title,
        questionText,
        transcript: fullTranscript || '(No response recorded)',
        durationSecs: duration,
        metrics,
      });
    }

    const prevLevel = ladderLevel - 1;
    setLadderLevel(prevLevel);
  };

  // Advance to next deeper level
  const handleNextLevel = () => {
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const metrics = computeMetrics(fullTranscript, duration);

    addLadderAnswer({
      level: ladderLevel,
      tierTitle: tier.title,
      questionText,
      transcript: fullTranscript || '(No response recorded)',
      durationSecs: duration,
      metrics,
    });

    setLadderLevel(ladderLevel + 1);
  };

  // Finish domain deep-dive and save session
  const handleFinishLadder = async () => {
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const metrics = computeMetrics(fullTranscript, duration);

    const currentAnswer = {
      level: ladderLevel,
      tierTitle: tier.title,
      questionText,
      transcript: fullTranscript || '(No response recorded)',
      durationSecs: duration,
      metrics,
    };

    addLadderAnswer(currentAnswer);

    const state = useSessionStore.getState();
    const allAnswers = [...state.ladderAnswers.filter((a) => a.level !== ladderLevel), currentAnswer];
    allAnswers.sort((a, b) => a.level - b.level);

    setProcessing(true);
    setProcessingStep(1);
    navigate('/processing');

    await delay(700);
    setProcessingStep(2);

    const combinedTranscript = allAnswers
      .map((a) => `Level ${a.level} (${a.questionText}): ${a.transcript}`)
      .join('\n\n');
    const totalSecs = allAnswers.reduce((sum, a) => sum + a.durationSecs, 0);

    const overallMetrics = computeMetrics(
      allAnswers.map((a) => a.transcript).join(' '),
      totalSecs
    );

    const avgOverall = Math.round(
      allAnswers.reduce((sum, a) => sum + (a.metrics?.overall || 50), 0) / allAnswers.length
    );
    overallMetrics.overall = avgOverall;

    await delay(700);
    setProcessingStep(3);

    let polished = '';
    if (combinedTranscript.length > 15) {
      polished = await polishTranscript(combinedTranscript, `Topic Ladder: ${ladderDomain}`);
    } else {
      polished = 'Ladder answers were too brief for a full polished script rewrite.';
    }

    await delay(500);
    setProcessingStep(4);
    await delay(400);

    addSession({
      context: `Topic Ladder: ${ladderDomain} (${allAnswers.length} Levels)`,
      sessionType: 'ladder',
      drillAnswers: allAnswers,
      rawTranscript: combinedTranscript,
      annotatedTranscript: annotateTranscript(combinedTranscript),
      polishedScript: polished,
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

  return (
    <div className="w-full max-w-[800px] mx-auto min-h-[calc(100vh-60px)] flex flex-col justify-between relative">
      {/* 1. STICKY TOP TIMER & LEVEL HEADER */}
      <div className="sticky top-[60px] z-40 bg-[#0e0e0d]/95 backdrop-blur-xl px-6 py-3 border-b border-border/50 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {ladderLevel > 1 && (
            <button
              onClick={handlePreviousLevel}
              className="text-[12px] text-accent hover:underline bg-surface border border-border px-3 py-1 rounded-full cursor-pointer font-medium transition-all"
            >
              ← Previous Level
            </button>
          )}
          <span className="text-[12px] text-text3 font-medium max-[640px]:hidden">Domain: <strong className="text-text">{ladderDomain}</strong></span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border uppercase tracking-wider ${tier.badgeClass}`}>
            {tier.title}
          </span>
        </div>

        <div className="font-mono text-[14px] px-3.5 py-1 rounded-full border bg-surface border-border text-text">
          ⏱ {fmtTime(elapsed)}
        </div>
      </div>

      {/* 2. MAIN QUESTION & RECORDING CONTENT */}
      <div className="px-6 py-6 flex-1 flex flex-col gap-6 max-[680px]:px-5">
        {/* Tier Goal Description */}
        <div className="text-[12px] text-text3 italic">
          💡 {tier.description}
        </div>

        {/* Question Display Card */}
        <div className="p-7 bg-surface border border-border-md rounded-2xl shadow-xl min-h-[120px] flex flex-col justify-center">
          <div className="text-[10px] tracking-[0.2em] uppercase text-accent mb-2 font-medium">
            Level {ladderLevel} Question
          </div>
          {loadingQuestion ? (
            <div className="text-[16px] text-text3 italic animate-pulse">
              Generating deeper question for level {ladderLevel}...
            </div>
          ) : (
            <>
              <h2 className="font-serif text-[26px] leading-[1.3] text-text font-normal max-[680px]:text-[20px]">
                "{questionText}"
              </h2>
              {questionHint && (
                <p className="text-[12px] text-text3 mt-3 italic">Tip: {questionHint}</p>
              )}
            </>
          )}
        </div>

        {/* Live Spoken Answer Box */}
        <div className="p-6 bg-surface/60 border border-border-md rounded-2xl shadow-inner flex flex-col justify-between min-h-[160px] max-h-[260px] overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text3 flex items-center gap-2">
              {isRecording && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              )}
              Your Spoken Answer ({fmtTime(elapsed)})
            </div>
            {isRecording && <WaveForm />}
          </div>

          <div ref={liveRef} className="overflow-y-auto font-sans text-[15px] leading-[1.75] text-text font-light flex-1 pr-1">
            {transcript || interim ? (
              <>
                <span className="text-text">{transcript}</span>
                {interim && <span className="text-text3 italic"> {interim}</span>}
              </>
            ) : (
              <span className="text-text3 italic">
                {isRecording
                  ? 'Listening... Speak your response.'
                  : 'Tap "Start Answer" when you are ready.'}
              </span>
            )}
          </div>
        </div>

        {!hasSpeechSupport && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[13px]">
            ⚠️ Web Speech API requires Chrome or Edge browser.
          </div>
        )}
      </div>

      {/* 3. STICKY BOTTOM ACTION BAR */}
      <div className="sticky bottom-0 z-40 bg-[#0e0e0d]/95 backdrop-blur-xl px-6 py-4 border-t border-border/60 shadow-2xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {!isRecording && !transcript ? (
            <button
              onClick={handleStart}
              disabled={loadingQuestion}
              className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
            >
              🎙 Start Answer
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleRecord}
                className={`inline-flex items-center gap-2 border rounded-xl px-6 py-3 font-sans text-[13px] font-medium transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                    : 'bg-surface text-text border-border-md hover:border-border-hi'
                }`}
              >
                {isRecording ? '⏸ Pause' : '▶ Resume Answer'}
              </button>

              {(transcript || elapsed > 0) && (
                <button
                  onClick={handleRestartAnswer}
                  title="Clear & restart level"
                  className="text-[13px] text-text3 hover:text-text bg-surface border border-border px-4 py-3 rounded-xl cursor-pointer transition-all"
                >
                  🔄 Restart
                </button>
              )}
            </>
          )}

          <div className="text-[12px] font-mono text-text3 bg-surface border border-border px-3 py-2 rounded-xl">
            ⏱ {fmtTime(elapsed)} elapsed
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishLadder}
            className="text-text3 text-[13px] font-light hover:text-text cursor-pointer bg-transparent border-none px-3 py-2"
          >
            ⏹ Finish Session
          </button>

          <button
            onClick={handleNextLevel}
            disabled={loadingQuestion}
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
          >
            🔥 Next Deeper Level →
          </button>
        </div>
      </div>
    </div>
  );
}
