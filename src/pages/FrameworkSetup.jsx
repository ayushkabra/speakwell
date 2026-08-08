import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { FRAMEWORK_PRESETS } from '../lib/frameworkGenerator';

export default function FrameworkSetup() {
  const navigate = useNavigate();
  const setFrameworkSetup = useSessionStore((s) => s.setFrameworkSetup);

  const [selectedFrameworkId, setSelectedFrameworkId] = useState('prep');
  const [promptText, setPromptText] = useState('');
  const actionSectionRef = useRef(null);

  const selectedFramework = FRAMEWORK_PRESETS.find((f) => f.id === selectedFrameworkId) || FRAMEWORK_PRESETS[0];

  const handleSelectFramework = (id) => {
    setSelectedFrameworkId(id);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleStartFramework = () => {
    setFrameworkSetup({
      frameworkType: selectedFrameworkId,
      prompt: promptText.trim() || selectedFramework.title,
    });
    navigate('/framework-record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[1080px] mx-auto px-8 pt-10 pb-20 max-[680px]:px-5">
      {/* Top Back Navigation */}
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
          <span>🧠 Guided Speech Frameworks</span>
          <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2.5 py-0.5 rounded-full">Authentic Thought Guide</span>
        </div>
        <h2 className="font-serif text-[40px] leading-[1.12] font-normal mb-2.5 max-[680px]:text-[28px]">
          Structure your thoughts <em className="italic text-accent">effortlessly.</em>
        </h2>
        <p className="text-[15px] text-text2 leading-[1.6]">
          Pick a mental structure to guide your thinking while preserving 100% of your authentic personal voice, stories, and natural delivery.
        </p>
      </div>

      {/* Framework Selection Cards (2x2 Desktop Grid) */}
      <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5 font-medium">
        Choose a Mental Framework
      </div>
      <div className="grid grid-cols-2 gap-4 mb-9 max-[768px]:grid-cols-1">
        {FRAMEWORK_PRESETS.map((f) => (
          <div
            key={f.id}
            onClick={() => handleSelectFramework(f.id)}
            className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-md ${
              selectedFrameworkId === f.id
                ? 'border-accent-border bg-accent-dim shadow-xl'
                : 'bg-surface border-border-md hover:border-border-hi hover:bg-surface2'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[28px]">{f.icon}</span>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border uppercase tracking-wider ${
                  selectedFrameworkId === f.id ? 'bg-accent text-[#0e0e0d] border-accent' : 'bg-surface2 text-text3 border-border'
                }`}>
                  {f.subtitle}
                </span>
              </div>
              <h3 className={`font-serif text-[22px] mb-1 ${selectedFrameworkId === f.id ? 'text-accent' : 'text-text'}`}>
                {f.title}
              </h3>
              <p className="text-[13px] text-text3 leading-[1.5] mb-3">{f.hint}</p>
            </div>
            <div className="text-[11px] text-accent font-mono uppercase tracking-wider font-medium">
              Best for: {f.bestFor}
            </div>
          </div>
        ))}
      </div>

      {/* Optional Speech Prompt Input */}
      <div className="mb-9">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
          Speech Topic / Prompt <span className="text-text3 tracking-normal">(optional — e.g. "Should AI replace entry jobs?")</span>
        </div>
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={`"Why our company should adopt ${selectedFramework.title}"`}
          className="w-full bg-surface border border-border-md rounded-xl p-[14px_18px] font-sans text-[14px] text-text outline-none transition-[border-color] duration-200 placeholder:text-text3 focus:border-accent-border shadow-sm"
        />
      </div>

      {/* Step Breakdown Preview */}
      <div className="mb-9 p-7 bg-surface border border-border-md rounded-2xl shadow-xl">
        <div className="text-[10px] tracking-[0.18em] uppercase text-accent mb-4 font-semibold">
          Guided Steps for {selectedFramework.title}
        </div>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
          {selectedFramework.steps.map((st) => (
            <div key={st.stepNum} className="p-4 bg-surface2/60 border border-border rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-accent font-semibold block mb-1">STEP {st.stepNum}</span>
                <span className="text-[14px] text-text font-medium leading-[1.3] block mb-2">{st.title}</span>
              </div>
              <span className="text-[11px] text-text3 font-mono">⏱ ~{st.suggestedSecs}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start Action Button */}
      <div ref={actionSectionRef} className="flex items-center gap-3 pt-2">
        <button
          onClick={handleStartFramework}
          className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-90 active:scale-[0.96] shadow-lg"
        >
          Start {selectedFramework.title} Rehearsal →
        </button>
      </div>
    </div>
  );
}
