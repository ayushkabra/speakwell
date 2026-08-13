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

  useEffect(() => {
    if (!drillQuestions || drillQuestions.length === 0) {
      navigate('/drill-setup');
    }
  }, [drillQuestions, navigate]);

  useEffect(() => {
    setHasSpeechSupport(isSpeechSupported());

    createRecognition({
      onResult: ({ finalText, interimText }) => {
        setTranscript(finalText);
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

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(drillTimerSecs);
    setIsRecording(true);
    startListening();
  };

  const handleRestartAnswer = () => {
    stopListening();
    setIsRecording(false);
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(drillTimerSecs);
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

  const handlePreviousQuestion = async () => {
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    if (fullTranscript || elapsed > 0) {
      const duration = elapsed || 1;
      const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
      const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);
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

  const handleNextOrFinish = async (skipped = false) => {
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
    const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);

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

      setProcessing(true);
      setProcessingStep(1);
      navigate('/processing');

      await delay(700);
      setProcessingStep(2);

      const combinedTranscript = allAnswers
        .map((a, idx) => `Q${idx + 1} (${a.questionText}): ${a.transcript}`)
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

      await delay(700);
      setProcessingStep(3);

      let polishResult = { polished: '', structuralMapping: null, strongestPoint: null };
      if (combinedTranscript.length > 15) {
        polishResult = await polishTranscript(combinedTranscript, 'Question Drill Practice Session');
      } else {
        polishResult = {
          polished: 'Drill answers were too brief for a full polished script rewrite.',
          structuralMapping: null,
          strongestPoint: null,
        };
      }

      await delay(500);
      setProcessingStep(4);
      await delay(400);

      addSession({
        context: `Question Drill (${allAnswers.length} Questions)`,
        sessionType: 'drill',
        drillAnswers: allAnswers,
        rawTranscript: combinedTranscript,
        annotatedTranscript: annotateTranscript(combinedTranscript, overallGrammar.matches),
        polishedScript: typeof polishResult === 'string' ? polishResult : (polishResult.polished || combinedTranscript),
        structuralMapping: polishResult.structuralMapping || null,
        strongestPoint: polishResult.strongestPoint || null,
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

  const wordCount = (transcript + ' ' + interim).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-16 max-[768px]:px-5">
      <div className="grid grid-cols-[44%_56%] gap-8 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-5 bg-surface border border-border-md rounded-2xl p-7 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              {currentDrillIndex > 0 && (
                <button
                  onClick={handlePreviousQuestion}
                  className="text-[12px] text-accent hover:underline bg-surface border border-border px-3 py-1 rounded-full cursor-pointer transition-all font-medium"
                >
                  ← Prev Q
                </button>
              )}
              <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                Question {currentDrillIndex + 1} of {totalQuestions}
              </span>
            </div>

            {drillTimerSecs > 0 && (
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
                  ⏱ {fmtTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>

          {drillTimerSecs > 0 && timeRemaining === 0 && isRecording && (
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-[13px] leading-[1.5]">
              ⏱ <strong>Time's up for target pace!</strong> Keep speaking to finish your thought, or click <em>Next Question →</em>.
            </div>
          )}

          <div className="p-6 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2 font-medium">
              Current Practice Question
            </div>
            <h2 className="font-serif text-[24px] leading-[1.35] text-text font-normal">
              "{currentQuestion}"
            </h2>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!isRecording && !transcript ? (
                <button
                  onClick={handleStart}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
                >
                  🎙 Start Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={handleToggleRecord}
                    className={`flex-1 inline-flex items-center justify-center gap-2 border rounded-xl px-5 py-3 font-sans text-[13px] font-medium transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                        : 'bg-surface text-text border-border-md hover:border-border-hi'
                    }`}
                  >
                    {isRecording ? '⏸ Pause' : '▶ Resume'}
                  </button>

                  {(transcript || elapsed > 0) && (
                    <button
                      onClick={handleRestartAnswer}
                      title="Clear & restart answer for this question"
                      className="text-[13px] text-text3 hover:text-text bg-surface border border-border p-3 rounded-xl cursor-pointer transition-all"
                    >
                      🔄 Restart
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleNextOrFinish(true)}
                className="text-text3 text-[13px] font-light hover:text-text cursor-pointer bg-transparent border-none py-2"
              >
                Skip Question
              </button>

              <button
                onClick={() => handleNextOrFinish(false)}
                className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
              >
                {isLastQuestion ? 'Finish Drill & See Results →' : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[460px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Answer (Q{currentDrillIndex + 1})</span>
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
              </div>
              <div className="flex items-center gap-3 text-[12px] font-mono text-text3">
                {isRecording && <WaveForm />}
                <span>Words: <strong className="text-text">{wordCount}</strong></span>
                <span>·</span>
                <span>Time: <strong className="text-text">{fmtTime(elapsed)}</strong></span>
              </div>
            </div>

            <div
              ref={liveRef}
              className="font-sans text-[16px] leading-[1.85] text-text2 italic text-left min-h-[340px] max-h-[420px] overflow-y-auto pr-2"
            >
              {transcript || interim ? (
                <>
                  <span className="text-text font-normal">{transcript}</span>
                  <span className="text-text3"> {interim}</span>
                </>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center text-text3 italic">
                  <span className="text-[32px] mb-2 opacity-50">🎯</span>
                  <span>Tap "Start Answer" and speak your answer to Question {currentDrillIndex + 1}.</span>
                </div>
              )}
            </div>
          </div>

          {!hasSpeechSupport && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[12px] mt-4">
              ⚠️ Speech recording ready (Groq Whisper Fallback active).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
