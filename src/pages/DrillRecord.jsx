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

export default function DrillRecord() {
  const navigate = useNavigate();
  const drillQuestions = useSessionStore((s) => s.drillQuestions);
  const drillTimerSecs = useSessionStore((s) => s.drillTimerSecs);
  const currentDrillIndex = useSessionStore((s) => s.currentDrillIndex);
  const setCurrentDrillIndex = useSessionStore((s) => s.setCurrentDrillIndex);
  const addDrillAnswer = useSessionStore((s) => s.addDrillAnswer);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(drillTimerSecs);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const timerRef = useRef(null);
  const liveRef = useRef(null);

  const currentQuestion = drillQuestions[currentDrillIndex] || 'No question found';
  const totalQuestions = drillQuestions.length;
  const isLastQuestion = currentDrillIndex === totalQuestions - 1;

  // Safeguard: Redirect if no questions present
  useEffect(() => {
    if (!drillQuestions || drillQuestions.length === 0) {
      navigate('/drill-setup');
    }
  }, [drillQuestions, navigate]);

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

  // Timer logic (DOES NOT STOP RECORDING WHEN REACHES 0)
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
        if (drillTimerSecs > 0) {
          setTimeRemaining((r) => {
            if (r <= 1) {
              return 0;
            }
            return r - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording, drillTimerSecs]);

  // Auto scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  // Start recording for current question
  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(drillTimerSecs);
    setIsRecording(true);
    startListening();
  };

  // Restart current question answer
  const handleRestartAnswer = () => {
    stopListening();
    setIsRecording(false);
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(drillTimerSecs);
  };

  // Toggle recording pause/resume
  const handleToggleRecord = () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startListening();
    }
  };

  // Navigate back to Previous Question
  const handlePreviousQuestion = () => {
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    if (fullTranscript || elapsed > 0) {
      const duration = elapsed || 1;
      const metrics = computeMetrics(fullTranscript, duration);
      addDrillAnswer({
        questionIndex: currentDrillIndex,
        questionText: currentQuestion,
        transcript: fullTranscript || '(No response recorded)',
        durationSecs: duration,
        metrics,
      });
    }

    const prevIndex = currentDrillIndex - 1;
    setCurrentDrillIndex(prevIndex);

    const state = useSessionStore.getState();
    const prevAnswer = state.drillAnswers.find((a) => a.questionIndex === prevIndex);
    if (prevAnswer && prevAnswer.transcript !== '(No response recorded)') {
      setTranscript(prevAnswer.transcript);
      setElapsed(prevAnswer.durationSecs || 0);
    } else {
      setTranscript('');
      setElapsed(0);
    }
    setInterim('');
    setTimeRemaining(drillTimerSecs);
  };

  // Move to next question or complete drill
  const handleNextOrFinish = async (skipped = false) => {
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const metrics = computeMetrics(fullTranscript, duration);

    const answerRecord = {
      questionIndex: currentDrillIndex,
      questionText: currentQuestion,
      transcript: skipped ? '(Skipped)' : fullTranscript || '(No response recorded)',
      durationSecs: duration,
      metrics,
    };

    addDrillAnswer(answerRecord);

    if (isLastQuestion) {
      const state = useSessionStore.getState();
      const allAnswers = state.drillAnswers;

      // Navigate to Processing screen
      setProcessing(true);
      setProcessingStep(1);
      navigate('/processing');

      await delay(700);
      setProcessingStep(2);

      const combinedTranscript = allAnswers
        .map((a, idx) => `Q${idx + 1} (${a.questionText}): ${a.transcript}`)
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
        polished = await polishTranscript(combinedTranscript, 'Question Drill Practice Session');
      } else {
        polished = 'Drill answers were too brief for a full polished script rewrite.';
      }

      await delay(500);
      setProcessingStep(4);
      await delay(400);

      const newSession = addSession({
        context: `Question Drill (${allAnswers.length} Questions)`,
        sessionType: 'drill',
        drillAnswers: allAnswers,
        rawTranscript: combinedTranscript,
        annotatedTranscript: annotateTranscript(combinedTranscript),
        polishedScript: polished,
        durationSecs: totalSecs,
        metrics: overallMetrics,
      });

      setProcessing(false);
      navigate('/results');
    } else {
      const nextIndex = currentDrillIndex + 1;
      setCurrentDrillIndex(nextIndex);

      const state = useSessionStore.getState();
      const nextAnswer = state.drillAnswers.find((a) => a.questionIndex === nextIndex);
      if (nextAnswer && nextAnswer.transcript !== '(No response recorded)') {
        setTranscript(nextAnswer.transcript);
        setElapsed(nextAnswer.durationSecs || 0);
      } else {
        setTranscript('');
        setElapsed(0);
      }
      setInterim('');
      setTimeRemaining(drillTimerSecs);
    }
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-[800px] mx-auto min-h-[calc(100vh-60px)] flex flex-col justify-between relative">
      {/* 1. STICKY TOP TIMER HEADER BAR (Always Pinned below Topbar) */}
      <div className="sticky top-[60px] z-40 bg-[#0e0e0d]/95 backdrop-blur-xl px-6 py-3 border-b border-border/50 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentDrillIndex > 0 && (
            <button
              onClick={handlePreviousQuestion}
              className="text-[12px] text-accent hover:underline bg-surface border border-border px-3 py-1 rounded-full cursor-pointer font-medium transition-all"
            >
              ← Previous Question
            </button>
          )}
          <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            Question {currentDrillIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Top Floating Timer Display */}
        <div className="flex items-center gap-2">
          {timeRemaining <= 3 && timeRemaining > 0 && isRecording && (
            <span className="text-[18px] font-bold text-amber-400 animate-bounce">
              {timeRemaining}...
            </span>
          )}
          <div
            className={`font-mono text-[14px] px-3.5 py-1 rounded-full border transition-all ${
              timeRemaining <= 3 && timeRemaining > 0
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                : timeRemaining === 0
                ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                : 'bg-surface border-border text-text'
            }`}
          >
            ⏱ {drillTimerSecs > 0 ? fmtTime(timeRemaining) : fmtTime(elapsed)}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="px-6 py-6 flex-1 flex flex-col gap-6 max-[680px]:px-5">
        {/* Time's Up Banner (Recording Continues Uninterrupted!) */}
        {drillTimerSecs > 0 && timeRemaining === 0 && isRecording && (
          <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-300 text-[13px] flex items-center justify-between shadow-lg animate-fade-up">
            <span>⏱ <strong>Time's up for recommended pace!</strong> Keep speaking to finish your thought, or click <em>Next Question →</em> when ready.</span>
          </div>
        )}

        {/* Question Display Card */}
        <div className="p-7 bg-surface border border-border-md rounded-2xl shadow-xl">
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2">
            Current Question
          </div>
          <h2 className="font-serif text-[26px] leading-[1.3] text-text font-normal max-[680px]:text-[20px]">
            "{currentQuestion}"
          </h2>
        </div>

        {/* Live Answer Box (Fixed Max Height with Internal Scroll) */}
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
                  ? 'Listening... Speak your answer freely.'
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

      {/* 3. STICKY BOTTOM ACTION BAR (Pinned at bottom with Dual Timer) */}
      <div className="sticky bottom-0 z-40 bg-[#0e0e0d]/95 backdrop-blur-xl px-6 py-4 border-t border-border/60 shadow-2xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {!isRecording && !transcript ? (
            <button
              onClick={handleStart}
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
                  title="Clear & restart answer for this question"
                  className="text-[13px] text-text3 hover:text-text bg-surface border border-border px-4 py-3 rounded-xl cursor-pointer transition-all"
                >
                  🔄 Restart
                </button>
              )}
            </>
          )}

          {/* Secondary Bottom Timer Indicator so you always see remaining/elapsed time */}
          <div className="text-[12px] font-mono text-text3 bg-surface border border-border px-3 py-2 rounded-xl">
            ⏱ {drillTimerSecs > 0 ? `${fmtTime(timeRemaining)} left` : `${fmtTime(elapsed)} elapsed`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNextOrFinish(true)}
            className="text-text3 text-[13px] font-light hover:text-text cursor-pointer bg-transparent border-none px-3 py-2"
          >
            Skip Question
          </button>

          <button
            onClick={() => handleNextOrFinish(false)}
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
          >
            {isLastQuestion ? 'Finish Drill & See Results →' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );
}
