import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { parseSlidesFromPdf, parseSlideOutlineFromText } from '../lib/slideParser';

const TIMER_OPTIONS = [
  { label: '30 sec / slide', value: 30 },
  { label: '60 sec / slide', value: 60 },
  { label: '90 sec / slide', value: 90 },
  { label: '2 min / slide', value: 120 },
  { label: '∞ Freeform', value: 0 },
];

export default function SlideSetup() {
  const navigate = useNavigate();
  const setSlideSetup = useSessionStore((s) => s.setSlideSetup);

  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'outline'
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [slides, setSlides] = useState([]);
  const [outlineText, setOutlineText] = useState('');
  const [selectedTimer, setSelectedTimer] = useState(60);

  const fileInputRef = useRef(null);

  // Handle PDF file upload
  const handleFileSelect = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    try {
      const parsedSlides = await parseSlidesFromPdf(file);
      setSlides(parsedSlides);
    } catch (err) {
      console.error('PDF parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle outline text import
  const handleOutlineSubmit = () => {
    const parsed = parseSlideOutlineFromText(outlineText);
    if (parsed.length > 0) {
      setSlides(parsed);
    }
  };

  // Start Slide Deck Practice
  const handleStartPresentation = () => {
    let finalSlides = slides;
    if (activeTab === 'outline' && slides.length === 0 && outlineText.trim()) {
      finalSlides = parseSlideOutlineFromText(outlineText);
    }
    if (finalSlides.length === 0) return;

    setSlideSetup({
      slides: finalSlides,
      timerSecs: selectedTimer,
    });
    navigate('/slide-record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[1080px] mx-auto px-8 pt-12 pb-20 max-[680px]:px-5">
      {/* Back to Home Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Exit & Back to Home
        </button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2 flex items-center gap-2 font-medium">
          <span>🖼️ Presentation Practice Mode</span>
          <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2.5 py-0.5 rounded-full">Slide Teleprompter</span>
        </div>
        <h2 className="font-serif text-[40px] leading-[1.12] font-normal mb-2.5 max-[680px]:text-[28px]">
          Rehearse your <em className="italic text-accent">Slide Deck.</em>
        </h2>
        <p className="text-[15px] text-text2 leading-[1.6]">
          Upload your presentation PDF (Google Slides, PowerPoint, Keynote) or paste your slide outline. Rehearse pitch audio slide-by-slide.
        </p>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex border-b border-b-border mb-7 flex-wrap">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'pdf'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          📄 PDF Slide Deck
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'outline'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          ✏️ Paste Slide Outline
        </button>
      </div>

      {/* TAB 1: PDF SLIDE DECK UPLOAD */}
      {activeTab === 'pdf' && (
        <div className="mb-9">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-surface border-2 border-dashed border-border-md rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 mb-6 shadow-sm"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pdf"
              className="hidden"
            />
            <div className="text-[42px] mb-2">🖼️</div>
            <div className="text-[16px] text-text font-medium mb-1">
              {fileName ? fileName : 'Drop your presentation PDF here'}
            </div>
            <div className="text-[13px] text-text3 max-w-[460px] mx-auto">
              {isParsing
                ? 'Rendering presentation slides to visual canvas...'
                : 'Upload Google Slides, PowerPoint, or Keynote deck exported as PDF.'}
            </div>
          </div>

          {/* Interactive Slide Gallery Preview */}
          {slides.length > 0 && (
            <div className="p-6 bg-surface border border-border-md rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                  Detected Presentation Deck ({slides.length} Slides)
                </div>
                <div className="text-[12px] text-text3">Ready for slide-by-slide rehearsal</div>
              </div>

              <div className="grid grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
                {slides.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-surface2/60 border border-border rounded-xl flex flex-col justify-between overflow-hidden"
                  >
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt={s.title}
                        className="w-full h-28 object-cover rounded-lg border border-border/50 mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-surface border border-border/50 rounded-lg flex items-center justify-center text-[24px] mb-2">
                        📊
                      </div>
                    )}
                    <div className="text-[12px] font-medium text-text truncate">{s.title}</div>
                    <div className="text-[10px] text-text3 font-mono">Page {s.pageNum}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASTE SLIDE OUTLINE */}
      {activeTab === 'outline' && (
        <div className="mb-9">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
            Paste Slide Titles / Outlines <span className="text-text3 tracking-normal">(one slide per line)</span>
          </div>
          <textarea
            value={outlineText}
            onChange={(e) => {
              setOutlineText(e.target.value);
              handleOutlineSubmit();
            }}
            placeholder="Slide 1: Executive Summary & Mission&#10;Slide 2: Market Problem & Pain Points&#10;Slide 3: Our AI Architecture & Demo&#10;Slide 4: Financial Trajectory & Ask"
            rows="6"
            className="w-full bg-surface border border-border-md rounded-xl p-[16px_20px] font-sans text-[14px] text-text font-light resize-none outline-none transition-[border-color] duration-200 min-h-[140px] leading-[1.6] placeholder:text-text3 focus:border-accent-border shadow-sm mb-4"
          />

          {slides.length > 0 && (
            <div className="text-[12px] text-accent font-medium">
              ✓ {slides.length} Slide cards parsed from outline
            </div>
          )}
        </div>
      )}

      {/* Per-Slide Response Timer */}
      <div className="mb-9 p-6 bg-surface border border-border rounded-xl shadow-sm">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
          Target Time per Slide
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedTimer(opt.value)}
              className={`px-4 py-2 rounded-lg text-[13px] font-sans transition-all cursor-pointer border ${
                selectedTimer === opt.value
                  ? 'bg-accent text-[#0e0e0d] border-accent font-medium shadow-md'
                  : 'bg-transparent text-text2 border-border-md hover:border-border-hi hover:text-text font-light'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <button
          onClick={handleStartPresentation}
          disabled={slides.length === 0 && !outlineText.trim()}
          className={`inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium transition-all duration-[180ms] ${
            slides.length > 0 || outlineText.trim()
              ? 'bg-accent text-[#0e0e0d] cursor-pointer hover:opacity-90 active:scale-[0.96] shadow-lg'
              : 'bg-surface2 text-text3 cursor-not-allowed border border-border'
          }`}
        >
          Start Slide Deck Presentation ({slides.length || 'Custom'} Slides) →
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none"
        >
          Cancel & Exit
        </button>
      </div>
    </div>
  );
}
