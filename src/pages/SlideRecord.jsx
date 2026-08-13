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

export default function SlideRecord() {
  const navigate = useNavigate();

  const slideDeck = useSessionStore((s) => s.slideDeck);
  const slideTimerSecs = useSessionStore((s) => s.slideTimerSecs);
  const currentSlideIndex = useSessionStore((s) => s.currentSlideIndex);
  const setCurrentSlideIndex = useSessionStore((s) => s.setCurrentSlideIndex);
  const addSlideAnswer = useSessionStore((s) => s.addSlideAnswer);
  const addSession = useSessionStore((s) => s.addSession);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setProcessingStep = useSessionStore((s) => s.setProcessingStep);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);
  const liveRef = useRef(null);

  const currentSlide = slideDeck[currentSlideIndex] || {};
  const totalSlides = slideDeck.length;
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  useEffect(() => {
    if (!slideDeck || slideDeck.length === 0) {
      navigate('/slide-setup');
    }
  }, [slideDeck, navigate]);

  useEffect(() => {
    createRecognition({
      onResult: ({ finalText, interimText }) => {
        setTranscript(finalText);
        setInterim(interimText || '');
      },
      onError: (err) => console.warn('Slide speech error:', err),
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

    addSlideAnswer({
      slideIndex: currentSlideIndex,
      pageNum: currentSlide.pageNum || currentSlideIndex + 1,
      title: currentSlide.title || `Slide ${currentSlideIndex + 1}`,
      transcript: fullTranscript || '(No response)',
      durationSecs: duration,
      metrics,
    });

    if (isLastSlide) {
      const state = useSessionStore.getState();
      const allAnswers = state.slideAnswers;

      setProcessing(true);
      setProcessingStep(1);
      navigate('/processing');

      await delay(600);
      setProcessingStep(2);

      const combinedTranscript = allAnswers
        .map((a) => `Slide ${a.pageNum} (${a.title}): ${a.transcript}`)
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

      const ctx = `Slide Deck Presentation (${totalSlides} Slides)`;
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
        sessionType: 'slide',
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
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);

      const state = useSessionStore.getState();
      const nextAnswer = state.slideAnswers.find((a) => a.slideIndex === nextIndex);
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
              Slide {currentSlideIndex + 1} of {totalSlides}
            </span>
            <span className="font-mono text-[13px] text-text3">⏱ {fmtTime(elapsed)}</span>
          </div>

          <div className="p-6 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent mb-1 font-semibold">
              {currentSlide.title || `Slide ${currentSlideIndex + 1}`}
            </div>
            <p className="text-[14px] text-text2 leading-[1.6]">
              {currentSlide.content || 'No text extracted for this slide.'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {!isRecording && !transcript ? (
              <button
                onClick={handleStart}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-lg"
              >
                🎙 Pitch Slide {currentSlideIndex + 1}
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
                  onClick={() => handleNextOrFinish()}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
                >
                  {isLastSlide ? 'Finish Pitch & See Results →' : 'Next Slide →'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Pitch Audio (Slide {currentSlideIndex + 1})</span>
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
                  <span className="text-[32px] mb-2 opacity-50">🖼️</span>
                  <span>Deliver your verbal pitch for Slide {currentSlideIndex + 1}.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
