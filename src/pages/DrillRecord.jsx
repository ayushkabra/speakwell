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

  // Timer logic
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

  // Start recording
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
      const allAnswers = [...state.drillAnswers, answerRecord];

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

      // Generate polished script for entire drill
      let polished = '';
      if (combinedTranscript.length > 20) {
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
      // Reset state for next question
      setTranscript('');
      setInterim('');
      setElapsed(0);
      setTimeRemaining(drillTimerSecs);
      setCurrentDrillIndex(currentDrillIndex + 1);
    }
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-fade-up w-full max-w-[760px] mx-auto px-6 pt-12 pb-20 max-[680px]:px-5">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider">
            Question {currentDrillIndex + 1} of {totalQuestions}
          </span>
        </div>
        {drillTimerSecs > 0 && (
          <div
            className={`font-mono text-[14px] px-3.5 py-1.5 rounded-full border transition-all ${
              timeRemaining <= 10 && timeRemaining > 0
                ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                : timeRemaining === 0
                ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                : 'bg-surface border-border text-text2'
            }`}
          >
            ⏱ {fmtTime(timeRemaining)}
          </div>
        )}
      </div>

      {/* Main Question Display Card */}
      <div className="mb-8 p-7 bg-surface border border-border-md rounded-2xl shadow-xl">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2">
          Current Question
        </div>
        <h2 className="font-serif text-[28px] leading-[1.3] text-text font-normal max-[680px]:text-[22px]">
          "{currentQuestion}"
        </h2>
      </div>

      {/* Recording Display */}
      <div className="mb-8 p-6 bg-surface/50 border border-border rounded-xl min-h-[160px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text3 flex items-center gap-2">
              {isRecording && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
              Your Answer ({fmtTime(elapsed)})
            </div>
            {isRecording && <WaveForm />}
          </div>
          <div className="font-sans text-[15px] leading-[1.7] text-text font-light min-h-[60px]">
            {transcript || interim ? (
              <>
                <span className="text-text">{transcript}</span>
                {interim && <span className="text-text3 italic"> {interim}</span>}
              </>
            ) : (
              <span className="text-text3 italic">
                {isRecording
                  ? 'Listening... Start speaking your answer.'
                  : 'Tap "Start Answer" when you are ready.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasSpeechSupport && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[13px]">
          ⚠️ Web Speech API is not fully supported in this browser. For best results, use Chrome or Edge.
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {!isRecording && !transcript ? (
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] hover:opacity-86 active:scale-[0.96]"
            >
              🎙 Start Answer
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleRecord}
                className={`inline-flex items-center gap-2 border rounded-[10px] px-6 py-3 font-sans text-[13px] transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                    : 'bg-surface text-text2 border-border-md hover:border-border-hi hover:text-text'
                }`}
              >
                {isRecording ? '⏸ Pause' : '▶ Resume Answer'}
              </button>

              {(transcript || elapsed > 0) && (
                <button
                  onClick={handleRestartAnswer}
                  title="Clear & restart answer for this question"
                  className="text-[12px] text-text3 hover:text-text bg-surface border border-border px-3 py-3 rounded-lg cursor-pointer transition-all"
                >
                  🔄 Restart
                </button>
              )}
            </>
          )}
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
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] hover:opacity-86 active:scale-[0.96]"
          >
            {isLastQuestion ? 'Finish Drill & See Results →' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );
}
