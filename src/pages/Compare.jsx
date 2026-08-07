import { useState, useEffect } from 'react';
import useSessionStore from '../store/useSessionStore';
import { compareInsight } from '../lib/apiClient';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

const METRIC_KEYS = [
  { key: 'overall', label: 'Overall score' },
  { key: 'fillers', label: 'Filler words', invert: true },
  { key: 'clarity', label: 'Clarity' },
  { key: 'wpm', label: 'Pace (WPM)' },
  { key: 'pauses', label: 'Pauses', invert: true },
  { key: 'grammar', label: 'Grammar errors', invert: true },
];

export default function Compare() {
  const sessions = useSessionStore((s) => s.sessions);
  const [filter, setFilter] = useState('all'); // 'all' | 'free' | 'drill'
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'free') return s.sessionType !== 'drill';
    if (filter === 'drill') return s.sessionType === 'drill';
    return true;
  });

  const sessionA = filteredSessions.find((s) => s.id === idA);
  const sessionB = filteredSessions.find((s) => s.id === idB);

  // Auto-select top two sessions when filter or sessions change
  useEffect(() => {
    if (filteredSessions.length >= 2) {
      setIdA(filteredSessions[1].id);
      setIdB(filteredSessions[0].id);
    } else if (filteredSessions.length === 1) {
      setIdA(filteredSessions[0].id);
      setIdB('');
    } else {
      setIdA('');
      setIdB('');
    }
  }, [filter, sessions]);

  // Fetch insight when both selected
  useEffect(() => {
    if (sessionA && sessionB) {
      if (idA === idB) {
        setInsight('You selected the same session twice. Please choose two different sessions to compare your progress over time.');
        return;
      }
      setLoading(true);
      setInsight('');
      compareInsight(sessionA, sessionB)
        .then((text) => setInsight(text))
        .finally(() => setLoading(false));
    }
  }, [idA, idB]);

  const getDelta = (key, invert) => {
    if (!sessionA || !sessionB) return { valA: 0, valB: 0, change: '', cls: 'flat' };
    const valA = sessionA.metrics?.[key] || 0;
    const valB = sessionB.metrics?.[key] || 0;
    const diff = valB - valA;
    if (diff === 0) return { valA, valB, change: '— same', cls: 'flat' };
    const improved = invert ? diff < 0 : diff > 0;
    const absD = Math.abs(diff);
    let changeText = '';
    if (key === 'fillers') {
      const pct = valA > 0 ? Math.round((absD / valA) * 100) : 0;
      changeText = improved ? `↓ ${pct}% fewer` : `↑ ${pct}% more`;
    } else if (key === 'pauses' || key === 'grammar') {
      changeText = improved ? `↓ ${invert ? 'improved' : ''}` : `↑ needs work`;
    } else {
      changeText = `${diff > 0 ? '↑' : '↓'} ${diff > 0 ? '+' : ''}${diff} pts`;
    }
    return { valA, valB, change: changeText, cls: improved ? 'up' : 'down' };
  };

  const getValColor = (key, val, isB) => {
    if (!isB) return 'text-text2';
    if (key === 'wpm') return val > 150 ? 'text-orange' : 'text-green';
    return 'text-accent';
  };

  if (sessions.length < 2) {
    return (
      <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-[72px] pb-20 text-center">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-3">Progress</div>
        <h2 className="font-serif text-[34px] leading-[1.15] font-normal mb-4">
          How far have<br />you <em className="italic text-accent">come?</em>
        </h2>
        <p className="text-[13px] text-text2 mt-2.5 mb-8">You need at least 2 sessions to compare. Keep practicing!</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up w-full max-w-[1140px] mx-auto px-8 pt-12 pb-20 max-[768px]:px-5">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2">Progress & Analytics</div>
        <h2 className="font-serif text-[38px] leading-[1.15] font-normal mb-2 max-[680px]:text-[28px]">
          How far have you <em className="italic text-accent">come?</em>
        </h2>
        <p className="text-[14px] text-text2 leading-[1.6]">Pick two past practice sessions and analyze your speech growth side-by-side.</p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex border-b border-b-border mb-6">
        {[
          { id: 'all', label: 'All Sessions' },
          { id: 'free', label: '🎙 Free Talk Only' },
          { id: 'drill', label: '🎯 Question Drills Only' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
              filter === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text3 hover:text-text2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session picker */}
      {filteredSessions.length >= 2 ? (
        <div className="grid grid-cols-[1fr_40px_1fr] gap-4 items-center mb-9 bg-surface border border-border-md rounded-2xl p-6 shadow-xl">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-2 font-medium">Earlier Session (Baseline)</div>
            <select
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              className="w-full bg-surface2 border border-border-md rounded-xl p-3.5 text-text text-[13px] font-sans cursor-pointer outline-none"
            >
              <option value="">Select session…</option>
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.date)} — {s.context} (Score: {s.metrics?.overall})
                </option>
              ))}
            </select>
          </div>

          <div className="font-serif italic text-[22px] text-accent text-center pt-5">vs</div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text3 mb-2 font-medium">Recent Session (Target)</div>
            <select
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              className="w-full bg-surface2 border border-border-md rounded-xl p-3.5 text-text text-[13px] font-sans cursor-pointer outline-none"
            >
              <option value="">Select session…</option>
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.date)} — {s.context} (Score: {s.metrics?.overall})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-surface border border-border rounded-xl text-center text-[13px] text-text3 mb-8">
          You need at least 2 sessions in this category ({filter === 'free' ? 'Free Talk' : 'Question Drills'}) to perform a direct comparison.
        </div>
      )}

      {/* Delta grid & Session Insight */}
      {sessionA && sessionB && (
        <div className="flex flex-col gap-6">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 font-medium">Metric comparison</div>
          <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
            {METRIC_KEYS.map(({ key, label, invert }) => {
              const { valA, valB, change, cls } = getDelta(key, invert);
              const changeColor = cls === 'up' ? 'text-green' : cls === 'down' ? 'text-red' : 'text-text3';
              return (
                <div key={key} className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <div className="text-[10px] tracking-[0.12em] uppercase text-text3 mb-3 font-medium">{label}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-center">
                      <div className="font-serif text-[30px] italic leading-none text-text2">{valA}</div>
                      <div className="text-[10px] text-text3 mt-[3px]">{sessionA ? formatDate(sessionA.date) : ''}</div>
                    </div>
                    <div className="text-[20px] text-border-md pb-2">/</div>
                    <div className="text-center">
                      <div className={`font-serif text-[30px] italic leading-none ${getValColor(key, valB, true)}`}>{valB}</div>
                      <div className={`text-[11px] font-medium mt-1 ${changeColor}`}>{change}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight */}
          <div className="p-6 bg-surface border border-border-md border-l-4 border-l-accent rounded-r-2xl shadow-xl">
            <div className="text-[10px] tracking-[0.16em] uppercase text-text3 mb-2 font-medium">AI Progress Insight</div>
            <div className="text-[15px] text-text2 leading-[1.85] italic">
              {loading ? 'Generating insight…' : insight || 'Select two sessions to compare.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
