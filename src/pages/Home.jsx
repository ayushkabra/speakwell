import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { getTodayWord } from '../lib/dailyWordGenerator';

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
  const todayWordObj = getTodayWord();

  const handleSessionClick = (session) => {
    setCurrentSession(session);
    navigate('/results');
  };

  const handleStartDailyWord = () => {
    setSessionType('free');
    setContext(`Daily Word: ${todayWordObj.word}`);
    setCustomContext(`Reflecting on "${todayWordObj.word}" (${todayWordObj.definition})`);
    navigate('/record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[1100px] mx-auto px-8 pt-12 pb-20 max-[680px]:px-4">
      {/* Hero Header */}
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4 border-b border-border/60 pb-8">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2 font-medium">
            Say it better
          </div>
          <h1 className="font-serif text-[52px] leading-[1.05] font-normal text-text mb-2.5 max-[680px]:text-[34px]">
            Speak freely.<br />
            <em className="italic text-accent">Sound sharp.</em>
          </h1>
          <p className="text-[14px] text-text2 leading-[1.6] max-w-[560px]">
            Open speech practice, teleprompter rehearsal, and structured thought frameworks.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/compare')}
            className="inline-flex items-center gap-2 bg-surface border border-border-md rounded-xl px-4 py-2.5 font-sans text-[12px] text-text2 font-medium cursor-pointer transition-all hover:border-accent-border hover:text-text shadow-sm"
          >
            ↔ Compare Sessions
          </button>
        </div>
      </div>

      {/* ULTRA-MINIMAL 1-LINE DAILY WORD ACTION STRIP */}
      <div className="mb-10 p-4 px-5 bg-surface2/60 border border-border rounded-xl shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.16em] uppercase text-accent font-semibold bg-accent/15 border border-accent/30 px-2.5 py-0.5 rounded-full">
            📅 Daily Word
          </span>
          <span className="font-serif text-[20px] text-text">
            "{todayWordObj.word}"
          </span>
        </div>

        <button
          onClick={handleStartDailyWord}
          className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-lg px-5 py-2 font-sans text-[13px] font-medium cursor-pointer transition-all duration-[180ms] hover:opacity-90 active:scale-[0.96] shadow-sm max-[680px]:w-full max-[680px]:justify-center"
        >
          Speak "{todayWordObj.word}" (60s) 🎙️ →
        </button>
      </div>

      {/* CORE SPEECH PRACTICE (Category 1) */}
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-semibold flex items-center gap-2">
          <span>Core Speech & Rehearsal</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
        </div>

        <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
          {/* Card 1: Free Talk */}
          <div
            onClick={() => navigate('/context')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🎙️</span>
                <span className="text-[11px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Start →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1">
                Free Talk Mode
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Speak freely on any prompt or open topic without limits.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Open Practice
            </div>
          </div>

          {/* Card 2: Script Teleprompter */}
          <div
            onClick={() => navigate('/script-setup')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">📜</span>
                <span className="text-[11px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Rehearse →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1 flex items-center gap-1.5">
                Script Teleprompter <span className="bg-accent/20 text-accent text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">New</span>
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Rehearse debate scripts, monologues, or PDFs with pace controls.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Script Rehearsal
            </div>
          </div>

          {/* Card 3: Speech Frameworks */}
          <div
            onClick={() => navigate('/framework-setup')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🧠</span>
                <span className="text-[11px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Guide →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1">
                Speech Frameworks
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Structure thoughts with PREP, STAR, or What-So What-Now What.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Mental Structure
            </div>
          </div>
        </div>
      </div>

      {/* SPECIALIZED REHEARSAL SUITES (Category 2) */}
      <div className="mb-12">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-semibold">
          Specialized Rehearsal Suites
        </div>

        <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
          {/* Card 4: Question Drills */}
          <div
            onClick={() => navigate('/drill-setup')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🎯</span>
                <span className="text-[11px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Setup →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1">
                Question Drills
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Upload PDF or paste custom question lists. Practice item-by-item.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Itemized Q&A
            </div>
          </div>

          {/* Card 5: Topic Ladders */}
          <div
            onClick={() => navigate('/ladder-setup')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🪜</span>
                <span className="text-[12px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Explore →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1">
                Topic Ladders
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Pick any domain and answer questions that get progressively deeper.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Progressive Deep-Dive
            </div>
          </div>

          {/* Card 6: Slide Decks */}
          <div
            onClick={() => navigate('/slide-setup')}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[26px]">🖼️</span>
                <span className="text-[11px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                  Upload →
                </span>
              </div>
              <div className="font-sans text-[16px] font-medium text-text mb-1">
                Slide Decks
              </div>
              <div className="text-[12px] text-text3 leading-[1.5]">
                Upload presentation PDF and rehearse pitch audio slide-by-slide.
              </div>
            </div>
            <div className="mt-5 text-[10px] text-accent font-mono uppercase tracking-wider">
              Slide Presentation Pitch
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview Bar */}
      <div className="flex gap-0 py-6 border-t border-t-border border-b border-b-border mb-10 bg-surface/40 rounded-xl px-6 max-[680px]:px-4">
        <div className="flex-1 pr-6 max-[680px]:pr-2">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1 max-[680px]:text-[26px]">
            {stats.count}
          </div>
          <div className="text-[10px] text-text3 tracking-[0.1em] uppercase">Total Sessions</div>
        </div>
        <div className="flex-1 pr-6 border-l border-l-border pl-6 max-[680px]:pl-2 max-[680px]:pr-2">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1 max-[680px]:text-[26px]">
            {stats.best || '—'}
          </div>
          <div className="text-[10px] text-text3 tracking-[0.1em] uppercase">Best Score</div>
        </div>
        <div className="flex-1 border-l border-l-border pl-6 max-[680px]:pl-2">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1 max-[680px]:text-[26px]">
            {stats.gained > 0 ? `↑${stats.gained}` : stats.gained === 0 ? '—' : `↓${Math.abs(stats.gained)}`}
          </div>
          <div className="text-[10px] text-text3 tracking-[0.1em] uppercase">Points Gained</div>
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <>
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-semibold">
            Recent Practice Sessions
          </div>
          <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
            {sessions.slice(0, 8).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="flex items-center justify-between p-3.5 px-4 bg-surface border border-border rounded-xl cursor-pointer transition-all duration-[180ms] hover:border-accent-border hover:bg-surface2 shadow-sm"
              >
                <div className="flex flex-col gap-[2px] truncate max-w-[80%]">
                  <div className="text-[13px] font-medium text-text flex items-center gap-2 truncate">
                    <span>{s.sessionType === 'script' ? '📜' : s.sessionType === 'framework' ? '🧠' : s.sessionType === 'slide' ? '🖼️' : s.sessionType === 'ladder' ? '🪜' : s.sessionType === 'drill' ? '🎯' : '🎙️'}</span>
                    <span className="truncate">{s.context || 'Free Talk'}</span>
                  </div>
                  <div className="text-[11px] text-text3">
                    {formatDate(s.date)} · {fmt(s.durationSecs)}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="font-serif text-[22px] italic text-accent">
                    {s.metrics?.overall || '—'}
                  </div>
                  <div className="text-text3 text-[14px]">›</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-12 text-text3 text-[13px]">
          <p className="mb-1">No sessions recorded yet.</p>
          <p>Pick any mode above to start practicing your speech.</p>
        </div>
      )}
    </div>
  );
}
