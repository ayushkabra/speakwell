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
  const [timeRemaining, setTimeRemaining] = useState(slideTimerSecs);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const timerRef = useRef(null);
  const liveRef = useRef(null);

  const currentSlide = slideDeck[currentSlideIndex] || { title: 'Slide Preview', pageNum: 1 };
  const totalSlides = slideDeck.length;
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  // Safeguard: Redirect if no slide deck
  useEffect(() => {
    if (!slideDeck || slideDeck.length === 0) {
      navigate('/slide-setup');
    }
  }, [slideDeck, navigate]);

  // Setup speech recognition
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

  // Timer logic
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
        if (slideTimerSecs > 0) {
          setTimeRemaining((r) => Math.max(0, r - 1));
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, slideTimerSecs]);

  // Auto scroll live transcript
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  // Start recording for current slide
  const handleStart = () => {
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(slideTimerSecs);
    setIsRecording(true);
    startListening();
  };

  // Restart slide recording
  const handleRestartSlide = () => {
    stopListening();
    setIsRecording(false);
    setTranscript('');
    setInterim('');
    setElapsed(0);
    setTimeRemaining(slideTimerSecs);
  };

  // Toggle record
  const handleToggleRecord = () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startListening();
    }
  };

  // Navigate to Previous Slide
  const handlePreviousSlide = () => {
    if (currentSlideIndex <= 0) return;
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    if (fullTranscript || elapsed > 0) {
      const duration = elapsed || 1;
      const metrics = computeMetrics(fullTranscript, duration);
      addSlideAnswer({
        slideIndex: currentSlideIndex,
        pageNum: currentSlide.pageNum || currentSlideIndex + 1,
        title: currentSlide.title,
        transcript: fullTranscript || '(No speech recorded)',
        durationSecs: duration,
        metrics,
      });
    }

    const prevIndex = currentSlideIndex - 1;
    setCurrentSlideIndex(prevIndex);

    const state = useSessionStore.getState();
    const prevAnswer = state.slideAnswers.find((a) => a.slideIndex === prevIndex);
    if (prevAnswer && prevAnswer.transcript !== '(No speech recorded)') {
      setTranscript(prevAnswer.transcript);
      setElapsed(prevAnswer.durationSecs || 0);
    } else {
      setTranscript('');
      setElapsed(0);
    }
    setInterim('');
    setTimeRemaining(slideTimerSecs);
  };

  // Advance to Next Slide or Complete Presentation
  const handleNextOrFinish = async () => {
    stopListening();
    setIsRecording(false);

    const fullTranscript = (transcript + ' ' + interim).trim();
    const duration = elapsed || 1;
    const metrics = computeMetrics(fullTranscript, duration);

    const slideRecord = {
      slideIndex: currentSlideIndex,
      pageNum: currentSlide.pageNum || currentSlideIndex + 1,
      title: currentSlide.title,
      transcript: fullTranscript || '(No speech recorded)',
      durationSecs: duration,
      metrics,
    };

    addSlideAnswer(slideRecord);

    if (isLastSlide) {
      const state = useSessionStore.getState();
      const allAnswers = state.slideAnswers;

      setProcessing(true);
      setProcessingStep(1);
      navigate('/processing');

      await delay(700);
      setProcessingStep(2);

      const combinedTranscript = allAnswers
        .map((a) => `[SLIDE ${a.pageNum}: ${a.title}]: ${a.transcript}`)
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
        polished = await polishTranscript(combinedTranscript, `Presentation Slide Deck Rehearsal (${allAnswers.length} Slides)`);
      } else {
        polished = 'Slide pitch answers were too brief for a full executive script rewrite.';
      }

      await delay(500);
      setProcessingStep(4);
      await delay(400);

      addSession({
        context: `Presentation Deck (${allAnswers.length} Slides)`,
        sessionType: 'slide',
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
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);

      const state = useSessionStore.getState();
      const nextAnswer = state.slideAnswers.find((a) => a.slideIndex === nextIndex);
      if (nextAnswer && nextAnswer.transcript !== '(No speech recorded)') {
        setTranscript(nextAnswer.transcript);
        setElapsed(nextAnswer.durationSecs || 0);
      } else {
        setTranscript('');
        setElapsed(0);
      }
      setInterim('');
      setTimeRemaining(slideTimerSecs);
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
      {/* 2-Column Split Desktop Rehearsal Suite */}
      <div className="grid grid-cols-[48%_52%] gap-8 items-start max-[900px]:grid-cols-1">
        {/* LEFT COLUMN: Visual Slide Canvas, Timer & Navigation */}
        <div className="flex flex-col gap-5 bg-surface border border-border-md rounded-2xl p-7 shadow-xl">
          {/* Header Bar with Slide Counter & Previous Slide Button */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              {currentSlideIndex > 0 && (
                <button
                  onClick={handlePreviousSlide}
                  className="text-[12px] text-accent hover:underline bg-surface border border-border px-3 py-1 rounded-full cursor-pointer transition-all font-medium"
                >
                  ← Prev Slide
                </button>
              )}
              <span className="bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                Slide {currentSlideIndex + 1} of {totalSlides}
              </span>
            </div>

            <div className="font-mono text-[14px] px-3.5 py-1 rounded-full border bg-surface border-border text-text">
              ⏱ {fmtTime(elapsed)}
            </div>
          </div>

          {/* Visual Slide Display Card */}
          <div className="p-4 bg-surface2/60 border border-border rounded-xl flex flex-col justify-between overflow-hidden">
            {currentSlide.imageUrl ? (
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="w-full max-h-[280px] object-contain rounded-lg border border-border/50 bg-black/40 mb-3"
              />
            ) : (
              <div className="w-full h-[200px] bg-surface border border-border/50 rounded-lg flex flex-col items-center justify-center text-center p-6 mb-3">
                <span className="text-[36px] mb-2">📊</span>
                <span className="font-serif text-[20px] text-text">{currentSlide.title}</span>
                <p className="text-[12px] text-text3 mt-2 line-clamp-2">{currentSlide.text}</p>
              </div>
            )}
            <div className="text-[13px] font-medium text-text flex items-center justify-between">
              <span>{currentSlide.title}</span>
              <span className="text-[11px] text-text3 font-mono">Page {currentSlide.pageNum || currentSlideIndex + 1}</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={handleRestartSlide}
                      title="Clear & restart recording for this slide"
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
                onClick={() => navigate('/')}
                className="text-text3 text-[13px] font-light hover:text-text cursor-pointer bg-transparent border-none py-2"
              >
                ⏹ Exit Session
              </button>

              <button
                onClick={handleNextOrFinish}
                className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
              >
                {isLastSlide ? 'Finish & Analyze Full Presentation →' : 'Next Slide →'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Spoken Teleprompter Transcript Box */}
        <div className="bg-surface border border-border-md rounded-2xl p-7 shadow-xl flex flex-col justify-between h-full min-h-[460px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-text3 font-medium flex items-center gap-2">
                <span>Spoken Pitch (Slide {currentSlideIndex + 1})</span>
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
                  <span className="text-[32px] mb-2 opacity-50">🖼️</span>
                  <span>Tap "Pitch Slide {currentSlideIndex + 1}" and speak your presentation pitch.</span>
                </div>
              )}
            </div>
          </div>

          {!hasSpeechSupport && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[12px] mt-4">
              ⚠️ Web Speech API requires Chrome or Edge browser.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
