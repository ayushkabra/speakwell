import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';

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
  const stats = getStats();

  const handleSessionClick = (session) => {
    setCurrentSession(session);
    navigate('/results');
  };

  return (
    <div className="animate-fade-up w-full max-w-[1140px] mx-auto px-8 pt-16 pb-20 max-[680px]:px-5">
      {/* Hero Header */}
      <div className="mb-12 flex items-end justify-between flex-wrap gap-6">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-3">
            Say it better
          </div>
          <h1 className="font-serif text-[56px] leading-[1.06] font-normal text-text mb-4 max-[680px]:text-[36px]">
            Speak freely.<br />
            <em className="italic text-accent">Sound sharp.</em>
          </h1>
          <p className="text-[15px] text-text2 leading-[1.8] max-w-[560px]">
            Practice open speech, drill custom question lists, or step up endless topic ladders. We listen, analyze, and hand you back a polished version of yourself.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/compare')}
            className="inline-flex items-center gap-2 bg-surface border border-border-md rounded-xl px-5 py-3 font-sans text-[13px] text-text2 font-medium cursor-pointer transition-all hover:border-accent-border hover:text-text shadow-sm"
          >
            ↔ Compare previous sessions
          </button>
        </div>
      </div>

      {/* Practice Mode Cards (Spacious 3-Column Grid) */}
      <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1 mb-12">
        <div
          onClick={() => navigate('/context')}
          className="p-6 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[28px]">🎙️</span>
              <span className="text-[12px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                Start →
              </span>
            </div>
            <div className="font-sans text-[18px] font-medium text-text mb-1.5">
              Free Talk Mode
            </div>
            <div className="text-[13px] text-text3 leading-[1.6]">
              Speak freely on any topic or prompt without artificial limits or rules.
            </div>
          </div>
          <div className="mt-6 text-[11px] text-accent font-mono uppercase tracking-wider">
            Open Speech Practice
          </div>
        </div>

        <div
          onClick={() => navigate('/drill-setup')}
          className="p-6 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[28px]">🎯</span>
              <span className="text-[12px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                Setup →
              </span>
            </div>
            <div className="font-sans text-[18px] font-medium text-text mb-1.5 flex items-center gap-2">
              Question Drills
            </div>
            <div className="text-[13px] text-text3 leading-[1.6]">
              Upload PDF or paste a question list. Practice answering item-by-item with timers.
            </div>
          </div>
          <div className="mt-6 text-[11px] text-accent font-mono uppercase tracking-wider">
            Itemized Q&A Practice
          </div>
        </div>

        <div
          onClick={() => navigate('/ladder-setup')}
          className="p-6 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 group shadow-xl flex flex-col justify-between relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[28px]">🪜</span>
              <span className="text-[12px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                Explore →
              </span>
            </div>
            <div className="font-sans text-[18px] font-medium text-text mb-1.5 flex items-center gap-2">
              Topic Ladders <span className="bg-accent/20 text-accent text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">New</span>
            </div>
            <div className="text-[13px] text-text3 leading-[1.6]">
              Pick a domain and answer questions that get endlessly deeper, tougher & more complex.
            </div>
          </div>
          <div className="mt-6 text-[11px] text-accent font-mono uppercase tracking-wider">
            Progressive Deep-Dive
          </div>
        </div>
      </div>

      {/* Stats Overview Bar */}
      <div className="flex gap-0 py-7 border-t border-t-border border-b border-b-border mb-12 bg-surface/40 rounded-2xl px-6">
        <div className="flex-1 pr-8">
          <div className="font-serif text-[40px] italic text-accent leading-none mb-1">
            {stats.count}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Total Sessions</div>
        </div>
        <div className="flex-1 pr-8 border-l border-l-border pl-8">
          <div className="font-serif text-[40px] italic text-accent leading-none mb-1">
            {stats.best || '—'}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Best Score</div>
        </div>
        <div className="flex-1 border-l border-l-border pl-8">
          <div className="font-serif text-[40px] italic text-accent leading-none mb-1">
            {stats.gained > 0 ? `↑${stats.gained}` : stats.gained === 0 ? '—' : `↓${Math.abs(stats.gained)}`}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Points Gained</div>
        </div>
      </div>

      {/* Recent Sessions (2-Column Desktop Grid) */}
      {sessions.length > 0 && (
        <>
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-4 font-medium">
            Recent Practice Sessions
          </div>
          <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
            {sessions.slice(0, 10).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="flex items-center justify-between p-4 px-5 bg-surface border border-border rounded-xl cursor-pointer transition-all duration-[180ms] hover:border-accent-border hover:bg-surface2 shadow-sm"
              >
                <div className="flex flex-col gap-[3px] truncate max-w-[80%]">
                  <div className="text-[14px] font-medium text-text flex items-center gap-2 truncate">
                    <span>{s.sessionType === 'ladder' ? '🪜' : s.sessionType === 'drill' ? '🎯' : '🎙️'}</span>
                    <span className="truncate">{s.context || 'Free Talk'}</span>
                  </div>
                  <div className="text-[12px] text-text3">
                    {formatDate(s.date)} · {fmt(s.durationSecs)} · {s.drillAnswers ? `${s.drillAnswers.length} Levels/Qs` : s.language || 'Auto'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-serif text-[24px] italic text-accent">
                    {s.metrics?.overall || '—'}
                  </div>
                  <div className="text-text3 text-[16px]">›</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 text-text3 text-[14px]">
          <p className="mb-2">No sessions yet.</p>
          <p>Choose "Free Talk", "Question Drills", or "Topic Ladders" to start practicing.</p>
        </div>
      )}
    </div>
  );
}
