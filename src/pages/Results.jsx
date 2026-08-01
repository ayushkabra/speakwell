import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import ScoreHero from '../components/ScoreHero';
import MetricCard from '../components/MetricCard';
import { getScoreNote } from '../lib/metricsEngine';

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function formatPolishedHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent font-sans text-[17px] font-semibold block mt-4 mb-1">$1</strong>')
    .replace(/^• (.*$)/gm, '<li class="ml-4 list-disc text-text2 my-1">$1</li>');
}

export default function Results() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.currentSession);
  const [activeTab, setActiveTab] = useState('transcript');
  const [expandedQuestion, setExpandedQuestion] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-text3">No session data. Please record a session first.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer"
        >
          Go to Home →
        </button>
      </div>
    );
  }

  const { metrics, context, durationSecs, rawTranscript, annotatedTranscript, polishedScript, drillAnswers, sessionType } = session;
  const note = getScoreNote(metrics);
  const isLadder = sessionType === 'ladder';
  const isDrill = isLadder || sessionType === 'drill' || (drillAnswers && drillAnswers.length > 0);

  const handleCopyPolished = () => {
    if (!polishedScript) return;
    const cleanText = polishedScript.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-up w-full max-w-[760px] mx-auto px-6 pt-[60px] pb-20 max-[680px]:px-5 relative">
      {/* Copied Toast Notification */}
      {copied && (
        <div className="fixed bottom-6 right-6 bg-accent text-[#0e0e0d] font-medium px-4 py-2.5 rounded-xl shadow-2xl z-50 text-[13px] animate-fade-up flex items-center gap-2">
          <span>✓</span> Polished script copied to clipboard!
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-1.5 flex items-center gap-2">
            {isLadder ? '🪜 Topic Ladder Mastery Results' : isDrill ? 'Question Drill Results' : 'Session Results'}
          </div>
          <h2 className="font-serif text-[28px] text-text font-normal">
            {isLadder ? 'Endless Ladder Performance' : isDrill ? 'Drill Performance Overview' : 'Speech Performance'}
          </h2>
        </div>
      </div>

      <ScoreHero score={metrics.overall} context={context} duration={fmt(durationSecs)} note={note} />

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-8 max-[680px]:grid-cols-2">
        {['wpm', 'clarity', 'flow', 'fillers', 'grammar', 'pauses'].map((key) => (
          <MetricCard key={key} metricKey={key} value={metrics[key]} />
        ))}
      </div>

      {/* Question / Level Breakdown */}
      {isDrill && drillAnswers && drillAnswers.length > 0 && (
        <div className="mb-8 p-6 bg-surface border border-border-md rounded-2xl">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-4 flex items-center justify-between">
            <span>{isLadder ? `Level-by-Level Progression (${drillAnswers.length} Levels)` : `Question-by-Question Breakdown (${drillAnswers.length} Questions)`}</span>
          </div>
          <div className="flex flex-col gap-3">
            {drillAnswers.map((ans, idx) => (
              <div
                key={idx}
                className="border border-border rounded-xl bg-surface2/60 overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-accent/20 text-accent font-serif text-[12px] flex items-center justify-center font-medium">
                      {isLadder ? `L${ans.level || idx + 1}` : `Q${idx + 1}`}
                    </span>
                    <div className="font-sans text-[14px] text-text font-medium truncate max-w-[420px]">
                      {ans.questionText}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-text3">{fmt(ans.durationSecs)}</span>
                    <span className="font-serif italic text-accent text-[18px]">
                      {ans.metrics?.overall || '—'}
                    </span>
                    <span className="text-text3 text-[14px]">
                      {expandedQuestion === idx ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandedQuestion === idx && (
                  <div className="p-4 pt-2 border-t border-border bg-surface/80">
                    <div className="text-[11px] text-text3 uppercase tracking-wider mb-1">Your Answer</div>
                    <div className="text-[14px] text-text2 leading-[1.7] mb-3 p-3 bg-surface border border-border rounded-lg">
                      {ans.transcript}
                    </div>
                    <div className="flex gap-4 text-[12px] text-text3">
                      <span>WPM: <strong className="text-text">{ans.metrics?.wpm}</strong></span>
                      <span>Clarity: <strong className="text-text">{ans.metrics?.clarity}%</strong></span>
                      <span>Fillers: <strong className="text-text">{ans.metrics?.fillers}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-b-border mb-6">
        <div className="flex gap-0">
          {['transcript', 'polished'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[12px] tracking-[0.1em] uppercase py-2.5 mr-7 cursor-pointer border-none border-b-[1.5px] bg-transparent font-sans font-light transition-all duration-[180ms]
                ${activeTab === tab ? 'text-accent border-b-accent font-medium' : 'text-text3 border-b-transparent'}`}
            >
              {tab === 'transcript' ? 'Full Session Transcript' : 'Polished Script'}
            </button>
          ))}
        </div>

        {activeTab === 'polished' && polishedScript && (
          <button
            onClick={handleCopyPolished}
            className="text-[12px] text-accent hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1 font-medium pb-1"
          >
            📋 {copied ? 'Copied!' : 'Copy Script'}
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'transcript' && (
        <div
          className="text-[15px] leading-[2.1] text-text2 p-[24px_28px] bg-surface border border-border rounded-[14px] mb-7 whitespace-pre-wrap font-sans"
          dangerouslySetInnerHTML={{ __html: annotatedTranscript || rawTranscript || 'No transcript available.' }}
        />
      )}

      {activeTab === 'polished' && (
        <div className="bg-surface border border-border-md rounded-[14px] p-7 mb-7">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text3">
              Executive Polished Version
            </div>
            <button
              onClick={handleCopyPolished}
              className="text-[11px] bg-accent/15 text-accent border border-accent/30 px-3 py-1 rounded-full cursor-pointer hover:bg-accent/25 transition-all"
            >
              📋 {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div
            className="font-sans text-[15px] leading-[1.85] text-text whitespace-pre-wrap text-left"
            dangerouslySetInnerHTML={{ __html: formatPolishedHtml(polishedScript) || 'Generating polished script...' }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 flex-wrap">
        <button
          onClick={() => navigate(isLadder ? '/ladder-setup' : isDrill ? '/drill-setup' : '/context')}
          className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] hover:opacity-86 active:scale-[0.96]"
        >
          {isLadder ? 'Practice another Topic Ladder →' : isDrill ? 'Practice another drill →' : 'New session →'}
        </button>
        <button
          onClick={() => navigate('/compare')}
          className="inline-flex items-center gap-2 bg-transparent text-text2 border border-border-md rounded-[10px] px-6 py-[13px] font-sans text-[13px] font-light cursor-pointer transition-all duration-[180ms] hover:border-border-hi hover:text-text"
        >
          ↔ Compare sessions
        </button>
      </div>
    </div>
  );
}
