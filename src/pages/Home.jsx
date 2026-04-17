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
    <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-20 pb-20 max-[680px]:px-5">
      {/* Hero */}
      <div className="mb-13">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-3">
          Say it better
        </div>
        <h1 className="font-serif text-[52px] leading-[1.06] font-normal text-text mb-5 max-[680px]:text-[36px]">
          Speak freely.<br />
          <em className="italic text-accent">Sound sharp.</em>
        </h1>
        <p className="text-[15px] text-text2 leading-[1.8] max-w-[420px] mb-8">
          No prompts. No judgment. Just speak — in any language. We listen, analyse, and hand you back a polished version of yourself.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/context')}
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-86 active:scale-[0.96]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            Start speaking
          </button>
          <button
            onClick={() => navigate('/compare')}
            className="inline-flex items-center gap-2 bg-transparent text-text2 border border-border-md rounded-[10px] px-6 py-[13px] font-sans text-[13px] font-light cursor-pointer transition-all duration-[180ms] hover:border-border-hi hover:text-text"
          >
            Compare sessions →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-0 py-7 border-t border-t-border border-b border-b-border mb-10">
        <div className="flex-1 pr-8">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1">
            {stats.count}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Sessions</div>
        </div>
        <div className="flex-1 pr-8 border-l border-l-border pl-8">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1">
            {stats.best || '—'}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Best score</div>
        </div>
        <div className="flex-1 border-l border-l-border pl-8">
          <div className="font-serif text-[36px] italic text-accent leading-none mb-1">
            {stats.gained > 0 ? `↑${stats.gained}` : stats.gained === 0 ? '—' : `↓${Math.abs(stats.gained)}`}
          </div>
          <div className="text-[11px] text-text3 tracking-[0.1em] uppercase">Points gained</div>
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <>
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3">
            Recent sessions
          </div>
          <div className="flex flex-col gap-2">
            {sessions.slice(0, 10).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="flex items-center justify-between p-4 px-5 bg-surface border border-border rounded-xl cursor-pointer transition-all duration-[180ms] hover:border-border-md hover:bg-surface2"
              >
                <div className="flex flex-col gap-[3px]">
                  <div className="text-[14px] font-medium text-text">
                    {s.context || 'Free Talk'}
                  </div>
                  <div className="text-[12px] text-text3">
                    {formatDate(s.date)} · {fmt(s.durationSecs)} · {s.language || 'Auto'}
                  </div>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="font-serif text-[22px] italic text-accent">
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
          <p>Tap "Start speaking" to record your first session.</p>
        </div>
      )}
    </div>
  );
}
