import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';

const TOPIC_REEL = [
  'Should AI replace human teachers in classrooms?',
  'Remote work vs In-office work: how to balance both?',
  'Why 90% of tech startups fail in their first 18 months',
  'How to pitch a complex startup idea in under 60 seconds',
  'Should artificial intelligence be granted copyright ownership?',
  'The ethics of autonomous decision-making in critical tech',
  'How to handle high-stakes counter-arguments in a debate',
  'What makes a great leader during times of sudden crisis?',
  'Is social media doing more harm than good to authentic communication?',
  'How to build genuine rapport with an audience instantly',
  'The role of failure in executive career progression',
  'Should college education be free for everyone?',
];

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useSessionStore((s) => s.sessions);
  const getStats = useSessionStore((s) => s.getStats);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const setContext = useSessionStore((s) => s.setContext);
  const setCustomContext = useSessionStore((s) => s.setCustomContext);
  const setSessionType = useSessionStore((s) => s.setSessionType);

  const stats = getStats();

  const [currentTopic, setCurrentTopic] = useState(TOPIC_REEL[0]);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpinTopic = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    let count = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * TOPIC_REEL.length);
      setCurrentTopic(TOPIC_REEL[idx]);
      count++;
      if (count > 8) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 80);
  };

  const handleStartSpinTopic = () => {
    setSessionType('free');
    setContext(currentTopic);
    setCustomContext(`Speaking on prompt: "${currentTopic}"`);
    navigate('/record');
  };

  const handleSessionClick = (session) => {
    setCurrentSession(session);
    navigate('/results');
  };

  return (
    <div className="animate-fade-up w-full max-w-[820px] mx-auto px-6 pt-24 pb-24 text-center">
      {/* BRAND & CENTERED HERO STAGE */}
      <div className="mb-12">
        <div className="text-[11px] tracking-[0.22em] uppercase text-[#c47a4a] mb-3 font-semibold">
          Say it better · Speaking practice
        </div>
        <h1 className="font-serif text-[48px] sm:text-[62px] leading-[1.04] text-[#f4e8d6] font-normal mb-4">
          Speak freely.<br />
          <em className="italic text-[#c47a4a]">Sound sharp.</em>
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#f4e8d6]/70 leading-[1.6] max-w-[540px] mx-auto font-sans">
          Spin a thoughtful topic and speak off-the-cuff, or rehearse structured debate scripts and slide decks.
        </p>
      </div>

      {/* INTERACTIVE TOPIC SPINNER REEL (unprompted.cool style) */}
      <div className="mb-14 p-8 sm:p-10 bg-[#161c1a]/90 border border-[#f4e8d61f] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden transition-all hover:border-[#c47a4a80]">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#c47a4a] font-semibold mb-4">
          🎲 Prompt Reel · Spin & Practice
        </div>

        <div className="min-h-[110px] flex items-center justify-center my-2 px-2">
          <h2
            className={`font-serif text-[26px] sm:text-[34px] leading-[1.25] text-[#f4e8d6] font-normal transition-all ${
              isSpinning ? 'opacity-50 scale-98' : 'animate-topic-in'
            }`}
          >
            "{currentTopic}"
          </h2>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <button
            onClick={handleSpinTopic}
            disabled={isSpinning}
            className="px-5 py-3 rounded-full bg-[#f4e8d6]/10 border border-[#f4e8d6]/20 text-[#f4e8d6] text-[13px] font-medium cursor-pointer transition-all hover:bg-[#c47a4a]/20 hover:border-[#c47a4a]/60 active:scale-95 flex items-center gap-2"
          >
            <span>🎲</span> Spin New Topic
          </button>

          <button
            onClick={handleStartSpinTopic}
            className="px-7 py-3 rounded-full bg-[#c47a4a] text-[#1a1612] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#e0925c] active:scale-95 shadow-[0_10px_28px_rgba(196,122,74,0.35)] flex items-center gap-2"
          >
            <span>🎙️</span> Speak This Topic (60s) →
          </button>
        </div>
      </div>

      {/* CORE PRACTICE MODES (Grouped Sleek Suites) */}
      <div className="mb-14 text-left">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#c47a4a] mb-4 font-semibold text-center">
          Practice Modes & Rehearsal Suites
        </div>

        <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-2 max-[560px]:grid-cols-1">
          {/* Card 1: Free Talk */}
          <div
            onClick={() => navigate('/context')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🎙️</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Start →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Free Talk Mode
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Speak freely on any custom prompt without limits.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Open Speech Practice
            </div>
          </div>

          {/* Card 2: Script Teleprompter */}
          <div
            onClick={() => navigate('/script-setup')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">📜</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Rehearse →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Script Teleprompter
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Rehearse debate scripts, monologues, or PDFs with WPM pace controls.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Script Rehearsal
            </div>
          </div>

          {/* Card 3: Speech Frameworks */}
          <div
            onClick={() => navigate('/framework-setup')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🧠</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Guide →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Speech Frameworks
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Structure thoughts with PREP, STAR, or What-So What-Now What.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Mental Structure
            </div>
          </div>

          {/* Card 4: Question Drills */}
          <div
            onClick={() => navigate('/drill-setup')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🎯</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Setup →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Question Drills
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Upload PDF or paste custom question lists. Practice item-by-item.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Itemized Q&A
            </div>
          </div>

          {/* Card 5: Topic Ladders */}
          <div
            onClick={() => navigate('/ladder-setup')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🪜</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Explore →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Topic Ladders
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Pick any domain and answer questions that get progressively deeper.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Progressive Deep-Dive
            </div>
          </div>

          {/* Card 6: Slide Decks */}
          <div
            onClick={() => navigate('/slide-setup')}
            className="p-5 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-[20px] cursor-pointer transition-all duration-200 hover:border-[#c47a4a80] hover:bg-[#1e2623] group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🖼️</span>
                <span className="text-[11px] text-[#c47a4a] font-medium group-hover:translate-x-1 transition-transform">
                  Upload →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-[#f4e8d6] mb-1">
                Slide Decks
              </div>
              <div className="text-[12px] text-[#f4e8d6]/60 leading-[1.5]">
                Upload presentation PDF and rehearse pitch audio slide-by-slide.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-[#c47a4a] font-mono uppercase tracking-wider">
              Slide Pitch Rehearsal
            </div>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW BAR */}
      <div className="flex gap-0 py-6 border-t border-b border-[#f4e8d61f] mb-12 bg-[#161c1a]/60 rounded-2xl px-6 max-[680px]:px-4">
        <div className="flex-1 pr-6 max-[680px]:pr-2">
          <div className="font-serif text-[38px] italic text-[#c47a4a] leading-none mb-1 max-[680px]:text-[28px]">
            {stats.count}
          </div>
          <div className="text-[10px] text-[#f4e8d6]/50 tracking-[0.1em] uppercase">Total Sessions</div>
        </div>
        <div className="flex-1 pr-6 border-l border-[#f4e8d61f] pl-6 max-[680px]:pl-2 max-[680px]:pr-2">
          <div className="font-serif text-[38px] italic text-[#c47a4a] leading-none mb-1 max-[680px]:text-[28px]">
            {stats.best || '—'}
          </div>
          <div className="text-[10px] text-[#f4e8d6]/50 tracking-[0.1em] uppercase">Best Score</div>
        </div>
        <div className="flex-1 border-l border-[#f4e8d61f] pl-6 max-[680px]:pl-2">
          <div className="font-serif text-[38px] italic text-[#c47a4a] leading-none mb-1 max-[680px]:text-[28px]">
            {stats.gained > 0 ? `↑${stats.gained}` : stats.gained === 0 ? '—' : `↓${Math.abs(stats.gained)}`}
          </div>
          <div className="text-[10px] text-[#f4e8d6]/50 tracking-[0.1em] uppercase">Points Gained</div>
        </div>
      </div>

      {/* RECENT SESSIONS */}
      {sessions.length > 0 && (
        <div className="text-left">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#c47a4a] mb-4 font-semibold text-center">
            Recent Practice Sessions
          </div>
          <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
            {sessions.slice(0, 8).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="flex items-center justify-between p-3.5 px-4 bg-[#161c1a]/80 border border-[#f4e8d61f] rounded-xl cursor-pointer transition-all duration-[180ms] hover:border-[#c47a4a80] hover:bg-[#1e2623]"
              >
                <div className="flex flex-col gap-[2px] truncate max-w-[80%]">
                  <div className="text-[13px] font-medium text-[#f4e8d6] flex items-center gap-2 truncate">
                    <span>{s.sessionType === 'script' ? '📜' : s.sessionType === 'framework' ? '🧠' : s.sessionType === 'slide' ? '🖼️' : s.sessionType === 'ladder' ? '🪜' : s.sessionType === 'drill' ? '🎯' : '🎙️'}</span>
                    <span className="truncate">{s.context || 'Free Talk'}</span>
                  </div>
                  <div className="text-[11px] text-[#f4e8d6]/50">
                    {formatDate(s.date)} · {fmt(s.durationSecs)}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="font-serif text-[22px] italic text-[#c47a4a]">
                    {s.metrics?.overall || '—'}
                  </div>
                  <div className="text-[#f4e8d6]/40 text-[14px]">›</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
