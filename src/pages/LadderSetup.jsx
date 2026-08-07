import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { DOMAIN_PRESETS } from '../lib/ladderGenerator';

export default function LadderSetup() {
  const navigate = useNavigate();
  const setLadderDomain = useSessionStore((s) => s.setLadderDomain);

  const [selectedDomain, setSelectedDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const actionSectionRef = useRef(null);

  const handleSelectDomain = (label) => {
    setSelectedDomain(label);
    setCustomDomain('');
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleStartLadder = (domain) => {
    const targetDomain = domain || customDomain.trim();
    if (!targetDomain) return;
    setLadderDomain(targetDomain);
    navigate('/ladder-record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[1080px] mx-auto px-8 pt-12 pb-20 max-[680px]:px-5">
      {/* Header */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2 flex items-center gap-2">
          <span>🪜 Topic Ladder Mode</span>
          <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2.5 py-0.5 rounded-full">Endless Deep-Dive</span>
        </div>
        <h2 className="font-serif text-[40px] leading-[1.12] font-normal mb-2 max-[680px]:text-[28px]">
          Choose a domain to <em className="italic text-accent">master.</em>
        </h2>
        <p className="text-[15px] text-text2 leading-[1.6]">
          Start with a warm-up and step up into deeper, tougher, and more complex questions level by level. No limits — go as deep as you want!
        </p>
      </div>

      {/* Domain Selection Grid (3-Column Desktop Grid) */}
      <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5 font-medium">
        Select a Domain
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
        {DOMAIN_PRESETS.map((preset) => (
          <div
            key={preset.id}
            onClick={() => handleSelectDomain(preset.label)}
            className={`bg-surface border rounded-2xl p-6 cursor-pointer transition-all duration-[180ms] flex flex-col justify-between shadow-md ${
              selectedDomain === preset.label
                ? 'border-accent-border bg-accent-dim shadow-xl'
                : 'border-border-md hover:border-border-hi hover:bg-surface2'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[28px]">{preset.icon}</span>
              <span className={`text-[16px] font-medium ${selectedDomain === preset.label ? 'text-accent' : 'text-text'}`}>
                {preset.label}
              </span>
            </div>
            <p className="text-[13px] text-text3 leading-[1.5]">{preset.hint}</p>
          </div>
        ))}
      </div>

      {/* Custom Topic Input */}
      <div className="mb-9">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
          Or Type Any Custom Topic <span className="text-text3 tracking-normal">(e.g. "Cryptocurrency", "Space Policy")</span>
        </div>
        <input
          type="text"
          value={customDomain}
          onChange={(e) => {
            setCustomDomain(e.target.value);
            if (e.target.value) setSelectedDomain('');
          }}
          placeholder='"Neuroscience & Human Brain"'
          className="w-full bg-surface border border-border-md rounded-xl p-[14px_18px] font-sans text-[14px] text-text outline-none transition-[border-color] duration-200 placeholder:text-text3 focus:border-accent-border shadow-sm"
        />
      </div>

      {/* Progression Preview Banner */}
      <div className="mb-9 p-7 bg-surface border border-border-md rounded-2xl shadow-xl">
        <div className="text-[10px] tracking-[0.18em] uppercase text-accent mb-4 font-semibold">
          How Difficulty Escalates (Endless Flow)
        </div>
        <div className="grid grid-cols-4 gap-3 max-[680px]:grid-cols-2">
          <div className="p-4 bg-surface2/60 border border-border rounded-xl">
            <span className="text-[10px] text-green-400 font-semibold block mb-1">LEVEL 1</span>
            <span className="text-[13px] text-text font-medium">Warm-Up</span>
          </div>
          <div className="p-4 bg-surface2/60 border border-border rounded-xl">
            <span className="text-[10px] text-amber-300 font-semibold block mb-1">LEVEL 2</span>
            <span className="text-[13px] text-text font-medium">Deep Analysis</span>
          </div>
          <div className="p-4 bg-surface2/60 border border-border rounded-xl">
            <span className="text-[10px] text-red-400 font-semibold block mb-1">LEVEL 3</span>
            <span className="text-[13px] text-text font-medium">Debate</span>
          </div>
          <div className="p-4 bg-surface2/60 border border-border rounded-xl">
            <span className="text-[10px] text-purple-300 font-semibold block mb-1">LEVEL 4+</span>
            <span className="text-[13px] text-text font-medium">Mastermind ∞</span>
          </div>
        </div>
      </div>

      {/* Start Button (Smooth Scroll Target) */}
      <div ref={actionSectionRef} className="flex items-center gap-3 pt-2">
        <button
          onClick={() => handleStartLadder(selectedDomain)}
          disabled={!selectedDomain && !customDomain.trim()}
          className={`inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-90 active:scale-[0.96] shadow-lg ${
            !selectedDomain && !customDomain.trim() ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          Start Topic Ladder →
        </button>
      </div>
    </div>
  );
}
