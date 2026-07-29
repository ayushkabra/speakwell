import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import ChipGrid from '../components/ChipGrid';
import { getRandomTopic } from '../lib/questionParser';

const TIMER_PRESETS = [
  { label: '∞ Freeform', secs: 0 },
  { label: '30s', secs: 30 },
  { label: '1 min', secs: 60 },
  { label: '2 min', secs: 120 },
  { label: '5 min', secs: 300 },
];

export default function Context() {
  const navigate = useNavigate();
  const selectedContext = useSessionStore((s) => s.selectedContext);
  const customContext = useSessionStore((s) => s.customContext);
  const setContext = useSessionStore((s) => s.setContext);
  const setCustomContext = useSessionStore((s) => s.setCustomContext);
  const setSessionType = useSessionStore((s) => s.setSessionType);

  const [activeTab, setActiveTab] = useState('choose'); // 'choose' | 'spinner'
  const [difficulty, setDifficulty] = useState('all'); // 'all' | 'easy' | 'medium' | 'hard'
  const [currentTopic, setCurrentTopic] = useState(getRandomTopic('all'));
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(0);

  const actionSectionRef = useRef(null);

  // Auto scroll down when a chip is selected
  const handleSelectChip = (chipLabel) => {
    setContext(chipLabel);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  // Spin Random Topic Animation
  const handleSpinTopic = () => {
    setIsSpinning(true);
    let counter = 0;
    const interval = setInterval(() => {
      setCurrentTopic(getRandomTopic(difficulty));
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 90);
  };

  const handleStart = (overrideContext) => {
    setSessionType('free');
    if (overrideContext) {
      setCustomContext(overrideContext);
    }
    navigate('/record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[760px] mx-auto px-6 pt-[60px] pb-20 max-[680px]:px-5">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2">
            Free Talk Mode
          </div>
          <h2 className="font-serif text-[36px] leading-[1.12] font-normal mb-2 max-[680px]:text-[28px]">
            What are you <em className="italic text-accent">preparing for?</em>
          </h2>
          <p className="text-[14px] text-text2 leading-[1.6]">
            Choose a context, type your own topic, or spin a random prompt to test your impromptu speaking skills.
          </p>
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex border-b border-b-border mb-8">
        <button
          onClick={() => setActiveTab('choose')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'choose'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          🎯 Standard Context
        </button>
        <button
          onClick={() => setActiveTab('spinner')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 flex items-center gap-1.5 ${
            activeTab === 'spinner'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          🎲 Random Topic Spinner <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full">New</span>
        </button>
      </div>

      {/* TAB 1: STANDARD CONTEXT & CUSTOM TOPIC */}
      {activeTab === 'choose' && (
        <>
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5">
            Choose a context
          </div>
          <ChipGrid selected={selectedContext} onSelect={handleSelectChip} />

          <div className="mb-8">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5">
              Anything specific? <span className="text-[10px] text-text3 tracking-normal">(optional)</span>
            </div>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder='"Pitching my startup to investors in Hindi"'
              rows="3"
              className="w-full bg-surface border border-border-md rounded-xl p-[14px_18px] font-sans text-[14px] text-text font-light resize-none outline-none transition-[border-color] duration-200 min-h-[76px] leading-[1.6] placeholder:text-text3 focus:border-accent-border"
            />
          </div>
        </>
      )}

      {/* TAB 2: RANDOM TOPIC SPINNER */}
      {activeTab === 'spinner' && (
        <div className="mb-8">
          {/* Difficulty selector */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="text-[11px] tracking-[0.15em] uppercase text-text3">
              Difficulty Level
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All Levels' },
                { id: 'easy', label: '🟢 Easy' },
                { id: 'medium', label: '🟡 Medium' },
                { id: 'hard', label: '🔴 Hard' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setDifficulty(lvl.id);
                    setCurrentTopic(getRandomTopic(lvl.id));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-sans transition-all cursor-pointer border ${
                    difficulty === lvl.id
                      ? 'bg-accent/20 text-accent border-accent/40 font-medium'
                      : 'bg-surface text-text3 border-border hover:text-text'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animated Spinner Card */}
          <div className="p-8 bg-surface border border-border-md rounded-2xl text-center shadow-xl relative overflow-hidden mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full font-medium">
                {currentTopic.category || 'Random Topic'}
              </span>
            </div>

            <h3
              className={`font-serif text-[26px] leading-[1.3] text-text font-normal max-w-[580px] mx-auto min-h-[78px] flex items-center justify-center transition-all duration-150 ${
                isSpinning ? 'opacity-40 scale-[0.98] blur-[0.5px]' : 'opacity-100 scale-100'
              }`}
            >
              "{currentTopic.text}"
            </h3>

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSpinTopic}
                disabled={isSpinning}
                className="inline-flex items-center gap-2 bg-surface2 text-text border border-border-md hover:border-accent-border rounded-xl px-5 py-2.5 font-sans text-[13px] font-medium cursor-pointer transition-all active:scale-[0.96]"
              >
                <span className={isSpinning ? 'animate-spin' : ''}>🎲</span>
                {isSpinning ? 'Spinning...' : 'Spin New Topic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Timer Selector */}
      <div className="mb-9 p-5 bg-surface border border-border rounded-xl">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3">
          Optional Session Timer <span className="text-text3 tracking-normal">(user choice)</span>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSelectedTimer(p.secs)}
              className={`px-4 py-2 rounded-lg text-[13px] font-sans transition-all cursor-pointer border ${
                selectedTimer === p.secs
                  ? 'bg-accent text-[#0e0e0d] border-accent font-medium'
                  : 'bg-transparent text-text2 border-border-md hover:border-border-hi hover:text-text font-light'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons (Smooth Scroll Target) */}
      <div ref={actionSectionRef} className="flex items-center gap-3 flex-wrap pt-2">
        {activeTab === 'spinner' ? (
          <button
            onClick={() => handleStart(currentTopic.text)}
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-86 active:scale-[0.96]"
          >
            Start Speaking on this Topic →
          </button>
        ) : (
          <>
            <button
              onClick={() => handleStart()}
              className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-86 active:scale-[0.96]"
            >
              Set context & start →
            </button>
            <button
              onClick={() => handleStart('')}
              className="inline-flex items-center gap-2 bg-transparent text-text2 border border-border-md rounded-[10px] px-6 py-[13px] font-sans text-[13px] font-light cursor-pointer transition-all duration-[180ms] hover:border-border-hi hover:text-text"
            >
              Skip — just start talking
            </button>
          </>
        )}
      </div>
    </div>
  );
}
