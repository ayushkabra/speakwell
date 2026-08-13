import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { createRecognition, isSpeechSupported, startListening, stopListening, destroyRecognition } from '../lib/speechEngine';
import { computeMetrics, annotateTranscript, checkGrammarWithLanguageTool } from '../lib/metricsEngine';
import { polishTranscript } from '../lib/apiClient';
import WaveForm from '../components/WaveForm';

const FRAMEWORK_STEPS = {
  prep: [
    { title: 'Point (P)', desc: 'State your main point directly in 1-2 sentences.', hint: 'e.g. "I believe remote work increases productivity because..."' },
    { title: 'Reason (R)', desc: 'Provide the underlying why or core rationale.', hint: 'e.g. "The main reason is that quiet environments enable uninterrupted deep work."' },
    { title: 'Example (E)', desc: 'Share a concrete story, data point, or real instance.', hint: 'e.g. "For instance, during our last sprint, output grew 30% when working async."' },
    { title: 'Point (P)', desc: 'Reiterate your core point with a strong takeaway.', hint: 'e.g. "Therefore, offering flexible work models is key to retaining talent."' },
  ],
  star: [
    { title: 'Situation (S)', desc: 'Set the context, background, and environment.', hint: 'e.g. "Last year, our team faced a severe database outage during Black Friday."' },
    { title: 'Task (T)', desc: 'Explain your specific role or responsibility in the situation.', hint: 'e.g. "My task was to stabilize the API gateway and isolate corrupt queries."' },
    { title: 'Action (A)', desc: 'Detail the concrete steps YOU took to solve it.', hint: 'e.g. "I deployed a rate limiter and rerouted traffic to read-replicas."' },
    { title: 'Result (R)', desc: 'Share the quantifiable outcome and key lesson learned.', hint: 'e.g. "As a result, downtime was capped at 12 minutes, saving $80k in sales."' },
  ],
  what: [
    { title: 'What?', desc: 'State the core fact, event, or problem clearly.', hint: 'e.g. "Our customer retention dropped 5% last quarter."' },
    { title: 'So What?', desc: 'Explain why this matters and its broader impact.', hint: 'e.g. "This matters because churn is eroding our annual recurring revenue growth."' },
    { title: 'Now What?', desc: 'Propose the immediate next step or solution.', hint: 'e.g. "Now what we must do is launch proactive onboarding calls for high-risk accounts."' },
  ],
  psi: [
    { title: 'Problem (P)', desc: 'Outline the current friction or issue.', hint: 'e.g. "Engineering teams spend 10 hours a week in manual deployments."' },
    { title: 'Solution (S)', desc: 'Present your proposed fix or approach.', hint: 'e.g. "We should automate our CI/CD pipeline with GitHub Actions."' },
    { title: 'Impact (I)', desc: 'Highlight the positive transformational result.', hint: 'e.g. "This will save 400 hours a month and accelerate release cycles by 3x."' },
  ],
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function FrameworkRecord() {
  const navigate = useNavigate();

  const frameworkType = useSessionStore((s) => s.frameworkType);
  const frameworkPrompt = useSessionStore((s) => s.frameworkPrompt);
  const currentFrameworkStep = useSessionStore((s) => s.currentFrameworkStep);
  const setCurrentFrameworkStep = useSessionStore((s) => s.setCurrentFrameworkStep);
  const addFrameworkAnswer = useSessionStore((s) => s.addFrameworkAnswer);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);
  const liveRef = useRef(null);

  const steps = FRAMEWORK_STEPS[frameworkType] || FRAMEWORK_STEPS.prep;
  const currentStep = steps[currentFrameworkStep] || steps[0];
  const isLastStep = currentFrameworkStep === steps.length - 1;

  useEffect(() => {
    createRecognition({
      onResult: ({ finalText, interimText }) => {
        setTranscript(finalText);
        setInterim(interimText || '');
      },
      onError: (err) => console.warn('Framework speech error:', err),
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
    if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight;
  }, [transcript, interim]);

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

  const handleNextOrFinish = async () => {
    const whisperResult = await stopListening();
    setIsRecording(false);

    const fullTranscript = (whisperResult || transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const grammarCheck = await checkGrammarWithLanguageTool(fullTranscript);
    const metrics = computeMetrics(fullTranscript, duration, grammarCheck.matches);

    addFrameworkAnswer({
      stepIndex: currentFrameworkStep,
      stepTitle: currentStep.title,
      transcript: fullTranscript || '(No response)',
      durationSecs: duration,
      metrics,
    });

    if (isLastStep) {
      const state = useSessionStore.getState();
      const allAnswers = state.frameworkAnswers;

      setProcessing(true);
      setProcessingStep(1);
      navigate('/processing');

      await delay(600);
      setProcessingStep(2);

      const combinedTranscript = allAnswers
        .map((a) => `${a.stepTitle}: ${a.transcript}`)
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

      const ctx = `Framework (${frameworkType.toUpperCase()}): ${frameworkPrompt || 'Speech'}`;
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
        sessionType: 'framework',
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
    } else {
      const nextIndex = currentFrameworkStep + 1;
      setCurrentFrameworkStep(nextIndex);

      const state = useSessionStore.getState();
      const nextAnswer = state.frameworkAnswers.find((a) => a.stepIndex === nextIndex);
      if (nextAnswer) {
        setTranscript(nextAnswer.transcript);
        setElapsed(nextAnswer.durationSecs || 0);
      } else {
        setTranscript('');
        setElapsed(0);
      }
      setInterim('');
    }
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-16 max-[768px]:px-5">
      <div className="grid grid-cols-[44%_56%] gap-8 items-start max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-5 bg-surface border border-border-md rounded-2xl p-7 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
              Step {currentFrameworkStep + 1} of {steps.length} · {frameworkType.toUpperCase()}
            </span>
            <span className="font-mono text-[13px] text-text3">⏱ {fmtTime(elapsed)}</span>
          </div>

          <div className="p-6 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent mb-1 font-semibold">
              {currentStep.title}
            </div>
            <h2 className="font-serif text-[22px] leading-[1.3] text-text font-normal mb-2">
              {currentStep.desc}
            </h2>
            <p className="text-[12px] text-text3 italic leading-[1.5]">
              💡 {currentStep.hint}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {!isRecording && !transcript ? (
              <button
                onClick={handleStart}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
              >
                🎙 Start Step Answer
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleRecord}
                  className={`flex-1 inline-flex items-center justify-center gap-2 border rounded-xl px-5 py-3 font-sans text-[13px] font-medium transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                      : 'bg-surface text-text border-border-md'
                  }`}
                >
                  {isRecording ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  onClick={() => handleNextOrFinish()}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
                >
                  {isLastStep ? 'Finish & See Results →' : 'Next Step →'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Answer ({currentStep.title})</span>
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
                  <span className="text-[32px] mb-2 opacity-50">🧠</span>
                  <span>Speak your thoughts for step: {currentStep.title}.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
