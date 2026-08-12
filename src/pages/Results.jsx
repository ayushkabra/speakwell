import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import ScoreHero from '../components/ScoreHero';
import MetricCard from '../components/MetricCard';
import { getScoreNote } from '../lib/metricsEngine';

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function getPolishedString(text) {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text.polished) return String(text.polished);
  return String(text);
}

function formatPolishedHtml(text) {
  const str = getPolishedString(text);
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent font-sans text-[15px] font-semibold block mt-3 mb-1">$1</strong>')
    .replace(/^• (.*$)/gm, '<li class="ml-4 list-disc text-text2 my-1">$1</li>');
}

function formatMasterScriptHtml(text) {
  if (!text) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<h3 class="font-serif text-[18px] text-accent font-normal mt-5 mb-2 border-b border-border/40 pb-1">$1</h3>')
    .replace(/^• (.*$)/gm, '<li class="ml-4 list-disc text-text2 my-1.5">$1</li>');
}

export default function Results() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.currentSession);
  const [activeTab, setActiveTab] = useState('compare'); // Default: Side-by-side comparison ↔
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

  const { metrics, context, durationSecs, rawTranscript, annotatedTranscript, polishedScript, masterScript, coachingTips, structuralMapping, strongestPoint, drillAnswers, sessionType } = session;
  const note = getScoreNote(metrics);
  const isScript = sessionType === 'script';
  const isFramework = sessionType === 'framework';
  const isSlide = sessionType === 'slide';
  const isLadder = sessionType === 'ladder';
  const isDrill = isFramework || isSlide || isLadder || sessionType === 'drill' || (drillAnswers && drillAnswers.length > 0);

  const handleCopyText = (content) => {
    if (!content) return;
    const cleanText = String(content).replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-up w-full max-w-[1180px] mx-auto px-8 pt-8 pb-20 max-[768px]:px-5 relative">
      {/* Copied Toast Notification */}
      {copied && (
        <div className="fixed bottom-6 right-6 bg-accent text-[#0e0e0d] font-medium px-4 py-2.5 rounded-xl shadow-2xl z-50 text-[13px] animate-fade-up flex items-center gap-2">
          <span>✓</span> Text copied to clipboard!
        </div>
      )}

      {/* Top Back Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Back to Home
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 border-b border-border/60 pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-1 flex items-center gap-2 font-medium">
            {isScript ? '📜 Script Rehearsal Teleprompter Results' : isFramework ? '🧠 Guided Speech Framework Results' : isSlide ? '🖼️ Presentation Slide Deck Results' : isLadder ? '🪜 Topic Ladder Mastery Results' : isDrill ? '🎯 Question Drill Results' : '🎙️ Session Results'}
          </div>
          <h2 className="font-serif text-[32px] text-text font-normal">
            {isScript ? 'Script Delivery & Pacing Overview' : isFramework ? 'Mental Structure & Authentic Speech' : isSlide ? 'Slide Pitch Performance' : isLadder ? 'Endless Ladder Overview' : isDrill ? 'Drill Performance Overview' : 'Speech Performance Overview'}
          </h2>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(isScript ? '/script-setup' : isFramework ? '/framework-setup' : isSlide ? '/slide-setup' : isLadder ? '/ladder-setup' : isDrill ? '/drill-setup' : '/context')}
            className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-6 py-3 font-sans text-[13px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-md"
          >
            {isScript ? 'Practice another Script →' : isFramework ? 'Practice another Framework →' : isSlide ? 'Practice another Slide Deck →' : isLadder ? 'Practice another Ladder →' : isDrill ? 'Practice another drill →' : 'New session →'}
          </button>
        </div>
      </div>

      {/* SCORE HERO SUMMARY (Top Banner) */}
      <div className="mb-8">
        <ScoreHero score={metrics.overall} context={context} duration={fmt(durationSecs)} note={note} />
      </div>

      {/* PRIMARY SECTION: SIDE-BY-SIDE TRANSCRIPT & MASTER SPEECH SUITE */}
      <div className="bg-surface border border-border-md rounded-2xl p-6 max-[600px]:p-4 shadow-xl mb-8">
        {/* Header & View Mode Switcher */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5 flex-wrap gap-3">
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-accent font-semibold mb-1">
              SPEECH ANALYSIS & MASTER REHEARSAL SUITE 🏆
            </div>
            <div className="text-[13px] text-text3">
              Compare your spoken speech, view authentic polish, or study an ideal master speech script.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('compare')}
              className={`text-[11px] tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-lg border cursor-pointer font-sans transition-all duration-[180ms] ${
                activeTab === 'compare'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-sm'
                  : 'bg-transparent border-border text-text3 hover:text-text'
              }`}
            >
              ↔ Side-by-Side Comparison
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`text-[11px] tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-lg border cursor-pointer font-sans transition-all duration-[180ms] ${
                activeTab === 'master'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-sm'
                  : 'bg-transparent border-border text-text3 hover:text-text'
              }`}
            >
              🏆 Ideal Master Speech Script
            </button>
            <button
              onClick={() => setActiveTab('coaching')}
              className={`text-[11px] tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-lg border cursor-pointer font-sans transition-all duration-[180ms] ${
                activeTab === 'coaching'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-sm'
                  : 'bg-transparent border-border text-text3 hover:text-text'
              }`}
            >
              💡 How To Speak Better
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`text-[11px] tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-lg border cursor-pointer font-sans transition-all duration-[180ms] ${
                activeTab === 'transcript'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-sm'
                  : 'bg-transparent border-border text-text3 hover:text-text'
              }`}
            >
              🎙️ Original Only
            </button>

            <button
              onClick={() => handleCopyText(activeTab === 'master' ? masterScript : polishedScript)}
              className="text-[12px] text-accent hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1 font-medium ml-2"
            >
              📋 {copied ? 'Copied!' : 'Copy Script'}
            </button>
          </div>
        </div>

        {/* TAB 1: SIDE-BY-SIDE COMPARISON (DEFAULT) */}
        {activeTab === 'compare' && (
          <div className="grid grid-cols-2 gap-5 max-[768px]:grid-cols-1">
            {/* Left: Original Spoken Transcript */}
            <div className="p-5 bg-surface2/50 border border-border rounded-xl flex flex-col justify-between">
              <div>
                <div className="text-[10px] tracking-[0.16em] uppercase text-text3 font-semibold mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="flex items-center gap-1.5">🎙️ Original Spoken Speech</span>
                  <span className="text-[9px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-normal">(Raw + Fillers)</span>
                </div>
                <div
                  className="text-[14px] leading-[1.85] text-text2 font-sans max-h-[460px] overflow-y-auto pr-2 whitespace-pre-wrap text-left"
                  dangerouslySetInnerHTML={{ __html: annotatedTranscript || rawTranscript || 'No transcript recorded.' }}
                />
              </div>
              <div className="mt-4 pt-2.5 border-t border-border/40 text-[11px] text-text3 italic flex items-center justify-between">
                <span>Highlighted words show verbal fillers & pauses</span>
                <span>WPM: {metrics.wpm}</span>
              </div>
            </div>

            {/* Right: Authentic De-Cluttered Version */}
            <div className="p-5 bg-surface2/50 border border-accent/30 rounded-xl flex flex-col justify-between">
              <div>
                <div className="text-[10px] tracking-[0.16em] uppercase text-accent font-semibold mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="flex items-center gap-1.5">✨ Authentic De-Cluttered Version</span>
                  <span className="text-[9px] text-accent bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-full font-normal">(Cleaned)</span>
                </div>
                <div
                  className="text-[14px] leading-[1.85] text-text font-sans max-h-[460px] overflow-y-auto pr-2 whitespace-pre-wrap text-left"
                  dangerouslySetInnerHTML={{ __html: formatPolishedHtml(polishedScript) || 'Generating authentic script...' }}
                />
              </div>
              <div className="mt-4 pt-2.5 border-t border-border/40 text-[11px] text-accent/80 italic flex items-center justify-between">
                <span>Preserves 100% of your authentic voice & vocabulary</span>
                <span>Zero AI Jargon</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IDEAL MASTER SPEECH SCRIPT */}
        {activeTab === 'master' && (
          <div className="p-6 bg-surface2/60 border border-accent/30 rounded-xl max-h-[520px] overflow-y-auto">
            <div className="text-[10px] tracking-[0.18em] uppercase text-accent font-semibold mb-2 flex items-center justify-between border-b border-border/40 pb-3">
              <span>🏆 Ideal Master Speech Script: "{context || 'Topic'}"</span>
              <span className="text-[9px] bg-accent/15 text-accent border border-accent/30 px-2.5 py-0.5 rounded-full font-normal">
                Structured Executive Blueprint
              </span>
            </div>
            {masterScript ? (
              <div
                className="font-sans text-[15px] leading-[1.85] text-text text-left"
                dangerouslySetInnerHTML={{ __html: formatMasterScriptHtml(masterScript) }}
              />
            ) : (
              <div className="p-8 text-center text-text3 italic text-[14px]">
                Generating master speech script for "{context}"...
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HOW TO SPEAK BETTER (COACHING BLUEPRINT) */}
        {activeTab === 'coaching' && (
          <div className="p-6 bg-surface2/60 border border-border rounded-xl">
            <div className="text-[10px] tracking-[0.18em] uppercase text-accent font-semibold mb-4 flex items-center justify-between border-b border-border/40 pb-3">
              <span>💡 Executive Speech Coaching & Delivery Blueprint</span>
              <span className="text-[10px] text-text3">Actionable Improvements</span>
            </div>

            <div className="flex flex-col gap-3.5 mb-6">
              {coachingTips && coachingTips.length > 0 ? (
                coachingTips.map((tip, idx) => (
                  <div key={idx} className="p-4 bg-surface border border-border/80 rounded-xl flex items-start gap-3 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-serif text-[12px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="text-[14px] text-text leading-[1.6]">
                      {tip}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-surface border border-border rounded-xl text-[14px] text-text2">
                  💡 <strong>Focus Tip:</strong> Open with a clear thesis in your first 15 seconds, ground your argument with concrete evidence, and conclude with a strong wrap-up takeaway.
                </div>
              )}
            </div>

            {/* Quick Link to Rehearse Master Script */}
            <div className="p-4 bg-accent/10 border border-accent/25 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[13px] font-medium text-text">Want to rehearse the ideal master script with a teleprompter?</div>
                <div className="text-[12px] text-text3">Load the master script into the Script Teleprompter suite.</div>
              </div>
              <button
                onClick={() => {
                  useSessionStore.getState().setScriptText(masterScript || polishedScript);
                  navigate('/script-setup');
                }}
                className="bg-accent text-[#0e0e0d] border-none rounded-lg px-5 py-2.5 text-[12px] font-medium cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-sm"
              >
                📜 Rehearse in Teleprompter →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: ORIGINAL ONLY */}
        {activeTab === 'transcript' && (
          <div
            className="text-[15px] leading-[2] text-text2 p-5 bg-surface2/50 border border-border rounded-xl whitespace-pre-wrap font-sans max-h-[480px] overflow-y-auto text-left"
            dangerouslySetInnerHTML={{ __html: annotatedTranscript || rawTranscript || 'No transcript available.' }}
          />
        )}
      </div>

      {/* SECONDARY SECTION: 6 QUANTITATIVE METRICS & THOUGHT BLUEPRINT (Lower Grid) */}
      <div className="grid grid-cols-[40%_60%] gap-7 items-start max-[900px]:grid-cols-1">
        {/* LEFT COLUMN: 6 Metrics Grid with Actionable Coaching */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 font-semibold">
            Quantitative Speech Metrics
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['wpm', 'clarity', 'flow', 'fillers', 'grammar', 'pauses'].map((key) => (
              <MetricCard key={key} metricKey={key} value={metrics[key]} />
            ))}
          </div>

          <button
            onClick={() => navigate('/compare')}
            className="w-full inline-flex items-center justify-center gap-2 bg-surface border border-border-md rounded-xl p-3.5 font-sans text-[13px] text-text2 font-medium cursor-pointer transition-all hover:border-accent-border hover:text-text shadow-sm mt-2"
          >
            ↔ Compare with previous sessions
          </button>
        </div>

        {/* RIGHT COLUMN: Structural Blueprint & Drill Question Breakdown */}
        <div className="flex flex-col gap-6">
          {/* Structural Thought Blueprint Mapping Card */}
          {structuralMapping && (
            <div className="p-6 bg-surface border border-border-md rounded-2xl shadow-xl">
              <div className="text-[10px] tracking-[0.18em] uppercase text-accent mb-3 font-semibold flex items-center justify-between">
                <span>Structural Thought Blueprint 📐</span>
                <span className="text-[10px] text-text3 font-normal">Authentic Thought Mapping</span>
              </div>

              {strongestPoint && (
                <div className="mb-4 p-3.5 bg-accent/10 border border-accent/20 rounded-xl">
                  <div className="text-[10px] uppercase text-accent font-semibold mb-1">🌟 Strongest Landed Point</div>
                  <div className="text-[14px] text-text font-serif italic">"{strongestPoint}"</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                {structuralMapping.point && (
                  <div className="p-3.5 bg-surface2/60 border border-border rounded-xl">
                    <span className="text-[10px] text-accent font-semibold block mb-1 uppercase">📌 Core Point Stated</span>
                    <span className="text-[13px] text-text2 leading-[1.5] block">{structuralMapping.point}</span>
                  </div>
                )}
                {structuralMapping.reason && (
                  <div className="p-3.5 bg-surface2/60 border border-border rounded-xl">
                    <span className="text-[10px] text-accent font-semibold block mb-1 uppercase">💡 Key Rationale</span>
                    <span className="text-[13px] text-text2 leading-[1.5] block">{structuralMapping.reason}</span>
                  </div>
                )}
                {structuralMapping.example && (
                  <div className="p-3.5 bg-surface2/60 border border-border rounded-xl">
                    <span className="text-[10px] text-accent font-semibold block mb-1 uppercase">🎯 Evidence / Example</span>
                    <span className="text-[13px] text-text2 leading-[1.5] block">{structuralMapping.example}</span>
                  </div>
                )}
                {structuralMapping.conclusion && (
                  <div className="p-3.5 bg-surface2/60 border border-border rounded-xl">
                    <span className="text-[10px] text-accent font-semibold block mb-1 uppercase">🏁 Wrap-Up Takeaway</span>
                    <span className="text-[13px] text-text2 leading-[1.5] block">{structuralMapping.conclusion}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question / Step / Slide Breakdown Cards */}
          {isDrill && drillAnswers && drillAnswers.length > 0 && (
            <div className="p-6 bg-surface border border-border-md rounded-2xl shadow-xl">
              <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-4 font-medium flex items-center justify-between">
                <span>{isFramework ? `Framework Step Breakdown (${drillAnswers.length} Steps)` : isSlide ? `Slide-by-Slide Pitch Breakdown (${drillAnswers.length} Slides)` : isLadder ? `Level-by-Level Progression (${drillAnswers.length} Levels)` : `Question-by-Question Breakdown (${drillAnswers.length} Questions)`}</span>
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
                      <div className="flex items-center gap-3 truncate max-w-[70%]">
                        <span className="w-8 h-8 rounded-full bg-accent/20 text-accent font-serif text-[12px] flex items-center justify-center font-medium shrink-0">
                          {isFramework ? `Step ${ans.stepNum || idx + 1}` : isSlide ? `S${ans.pageNum || idx + 1}` : isLadder ? `L${ans.level || idx + 1}` : `Q${idx + 1}`}
                        </span>
                        <div className="font-sans text-[14px] text-text font-medium truncate">
                          {ans.title || ans.questionText}
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
                        <div className="text-[11px] text-text3 uppercase tracking-wider mb-1">Spoken Speech</div>
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
        </div>
      </div>
    </div>
  );
}
