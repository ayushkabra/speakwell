import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import ScoreHero from '../components/ScoreHero';
import MetricCard from '../components/MetricCard';
import { getScoreNote } from '../lib/metricsEngine';

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export default function Results() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.currentSession);
  const [activeTab, setActiveTab] = useState('transcript');

  if (!session) {
    return (
      <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-text3">No session data. Please record a session first.</p>
        <button onClick={() => navigate('/context')} className="mt-4 inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer">
          New session →
        </button>
      </div>
    );
  }

  const { metrics, context, durationSecs, rawTranscript, annotatedTranscript, polishedScript } = session;
  const note = getScoreNote(metrics);

  return (
    <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-[60px] pb-20 max-[680px]:px-5">
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-3">Session results</div>
      </div>

      <ScoreHero score={metrics.overall} context={context} duration={fmt(durationSecs)} note={note} />

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-7 max-[680px]:grid-cols-2">
        {['wpm', 'clarity', 'flow', 'fillers', 'grammar', 'pauses'].map((key) => (
          <MetricCard key={key} metricKey={key} value={metrics[key]} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-b-border mb-6">
        {['transcript', 'polished'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[12px] tracking-[0.1em] uppercase py-2.5 mr-7 cursor-pointer border-none border-b-[1.5px] bg-transparent font-sans font-light transition-all duration-[180ms]
              ${activeTab === tab ? 'text-accent border-b-accent' : 'text-text3 border-b-transparent'}`}
          >
            {tab === 'transcript' ? 'Transcript' : 'Polished script'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'transcript' && (
        <div className="text-[15px] leading-[2.1] text-text2 p-[24px_28px] bg-surface border border-border rounded-[14px] mb-7"
          dangerouslySetInnerHTML={{ __html: annotatedTranscript || rawTranscript || 'No transcript available.' }}
        />
      )}

      {activeTab === 'polished' && (
        <div className="bg-surface border border-border-md rounded-[14px] p-7 mb-7">
          <div className="flex items-center justify-between mb-[18px]">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text3">Your words — said better</div>
            <div className="text-[10px] bg-green-dim text-green border border-[rgba(121,191,156,0.2)] px-2.5 py-[3px] rounded-full">Voice preserved</div>
          </div>
          <div className="font-serif text-[16px] leading-[1.9] text-text italic">
            {polishedScript || 'No polished script available.'}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => navigate('/context')} className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] hover:opacity-86 active:scale-[0.96]">
          New session →
        </button>
        <button onClick={() => navigate('/compare')} className="inline-flex items-center gap-2 bg-transparent text-text2 border border-border-md rounded-[10px] px-6 py-[13px] font-sans text-[13px] font-light cursor-pointer transition-all duration-[180ms] hover:border-border-hi hover:text-text">
          ↔ Compare sessions
        </button>
      </div>
    </div>
  );
}
