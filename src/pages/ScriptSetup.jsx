import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { extractTextFromFile } from '../lib/questionParser';
import { parseDocumentSections, convertToSpeechScript } from '../lib/scriptSanitizer';

const SAMPLE_SCRIPTS = [
  {
    id: 'ted',
    icon: '🎙️',
    title: 'TED Talk Opening',
    desc: 'Engaging narrative opening for public keynotes',
    text: `Imagine a world where every conversation you have is memorable. Not because you used big words or memorized a script, but because you spoke with genuine conviction and clarity. Communication is not about perfection—it is about connection. When we strip away the fear of judgment, we uncover our most powerful tool: our authentic voice. Today, I want to share three principles that changed how I present under pressure.`,
  },
  {
    id: 'debate',
    icon: '⚡',
    title: 'Debate Rebuttal',
    desc: 'Structured high-velocity counter-argument',
    text: `My opponent argues that innovation requires total deregulation. However, history demonstrates the exact opposite: thoughtful governance creates the stable foundation upon which sustainable competition thrives. Look at the software industry—open protocols and clear standards didn't stifle growth; they accelerated global adoption. We must separate arbitrary restriction from essential guardrails.`,
  },
  {
    id: 'pitch',
    icon: '🚀',
    title: 'Executive Pitch',
    desc: 'Crisp startup proposal & ROI summary',
    text: `Over 80% of leadership teams report that poor communication delays critical project execution. Our platform solves this by delivering real-time speech structure feedback directly to team members. In our 90-day pilot, participant clarity scores jumped 34%, and meeting prep time was cut in half. We are raising $1.5M to scale our automated coaching engine to enterprise customers.`,
  },
];

const PACE_PRESETS = [
  { label: '🐢 Deliberate (120 WPM)', wpm: 120, desc: 'Keynotes & solemn speeches' },
  { label: '🎙️ Standard (140 WPM)', wpm: 140, desc: 'Natural presentation pace' },
  { label: '⚡ Fast Debate (170 WPM)', wpm: 170, desc: 'High-speed arguments & Q&A' },
];

export default function ScriptSetup() {
  const navigate = useNavigate();
  const setScriptSetup = useSessionStore((s) => s.setScriptSetup);

  const [scriptText, setScriptText] = useState('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [targetWpm, setTargetWpm] = useState(140);
  const [fileName, setFileName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSections, setExtractedSections] = useState([]);

  const fileInputRef = useRef(null);
  const actionSectionRef = useRef(null);

  const handleSelectSample = (sample) => {
    setScriptText(sample.text);
    setScriptTitle(sample.title);
    setExtractedSections([]);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setScriptTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsExtracting(true);

    try {
      const rawText = await extractTextFromFile(file);
      const sections = parseDocumentSections(rawText);
      setExtractedSections(sections);
      setScriptText(convertToSpeechScript(sections));
    } catch (err) {
      console.warn('File read error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle individual section enabled/disabled
  const handleToggleSection = (id) => {
    const updated = extractedSections.map((sec) =>
      sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
    );
    setExtractedSections(updated);
    setScriptText(convertToSpeechScript(updated));
  };

  // Sanitizer action: clean whitespace, page numbers, junk lines
  const handleSanitizeText = () => {
    const sections = parseDocumentSections(scriptText);
    setExtractedSections(sections);
    setScriptText(convertToSpeechScript(sections));
  };

  const handleStartScript = () => {
    if (!scriptText.trim()) return;
    setScriptSetup({
      text: scriptText.trim(),
      title: scriptTitle.trim() || 'Script Rehearsal',
      paceWpm: targetWpm,
    });
    navigate('/script-record');
  };

  const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMins = (wordCount / targetWpm).toFixed(1);

  return (
    <div className="animate-fade-up w-full max-w-[1080px] mx-auto px-8 pt-10 pb-20 max-[680px]:px-5">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0 font-light transition-all"
        >
          ← Exit & Back to Home
        </button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2 flex items-center gap-2 font-medium">
          <span>📜 Script Rehearsal & Teleprompter</span>
          <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2.5 py-0.5 rounded-full">Debate & Speech Prep</span>
        </div>
        <h2 className="font-serif text-[40px] leading-[1.12] font-normal mb-2.5 max-[680px]:text-[28px]">
          Rehearse your speech <em className="italic text-accent">flawlessly.</em>
        </h2>
        <p className="text-[15px] text-text2 leading-[1.6]">
          Paste your monologue, debate script, or presentation deck to convert raw text into a clean, spoken speech teleprompter.
        </p>
      </div>

      {/* Sample Presets */}
      <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
        Or Pick a Sample Script
      </div>
      <div className="grid grid-cols-3 gap-3.5 mb-8 max-[768px]:grid-cols-1">
        {SAMPLE_SCRIPTS.map((s) => (
          <div
            key={s.id}
            onClick={() => handleSelectSample(s)}
            className="p-5 bg-surface border border-border-md rounded-2xl cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 flex flex-col justify-between shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[24px]">{s.icon}</span>
                <span className="text-[11px] text-accent font-medium">Use Script →</span>
              </div>
              <div className="font-serif text-[18px] text-text mb-1">{s.title}</div>
              <div className="text-[12px] text-text3 leading-[1.4]">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Script Text Input & File Upload */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text3 font-medium">
            Paste or Upload Your Presentation Script
          </div>
          <div className="flex items-center gap-3">
            {scriptText.trim().length > 0 && (
              <button
                onClick={handleSanitizeText}
                className="text-[12px] text-accent hover:underline cursor-pointer bg-transparent border-none p-0 font-medium flex items-center gap-1"
                title="Automatically strip slide footers, page numbers, and bullet symbols"
              >
                🪄 Auto-Clean into Speech Script
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[12px] text-accent hover:underline cursor-pointer bg-transparent border-none p-0 font-medium flex items-center gap-1"
            >
              📁 {fileName ? fileName : 'Upload .pdf / .txt file'}
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".txt,.pdf,.md"
            className="hidden"
          />
        </div>

        <input
          type="text"
          value={scriptTitle}
          onChange={(e) => setScriptTitle(e.target.value)}
          placeholder="Script Title (e.g. Keynote Pitch / Rebuttal Speech)"
          className="w-full bg-surface border border-border-md rounded-xl p-[12px_16px] font-sans text-[14px] text-text outline-none mb-3 transition-[border-color] focus:border-accent-border shadow-sm"
        />

        {/* Interactive Speech Section Picker (if document sections detected) */}
        {extractedSections.length > 0 && (
          <div className="mb-4 p-5 bg-surface border border-border-md rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2.5">
              <div className="text-[11px] uppercase tracking-wider text-accent font-semibold flex items-center gap-2">
                <span>Interactive Section Filter ({extractedSections.filter((s) => s.enabled).length} of {extractedSections.length} sections selected)</span>
              </div>
              <span className="text-[11px] text-text3">Uncheck Table of Contents or unwanted sections</span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {extractedSections.map((sec) => (
                <div
                  key={sec.id}
                  onClick={() => handleToggleSection(sec.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    sec.enabled
                      ? 'bg-surface2/80 border-accent/40 text-text'
                      : 'bg-surface/40 border-transparent text-text3 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <input
                      type="checkbox"
                      checked={sec.enabled}
                      onChange={() => {}}
                      className="cursor-pointer accent-amber-400"
                    />
                    <span className="font-medium text-[13px] truncate">{sec.title}</span>
                  </div>
                  <span className="text-[11px] text-text3 font-mono shrink-0">
                    {sec.content.slice(0, 45)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder={isExtracting ? 'Extracting clean readable text from document...' : 'Paste your speech, monologue, or debate text here...'}
            rows="8"
            className="w-full bg-surface border border-border-md rounded-2xl p-5 font-sans text-[15px] text-text leading-[1.75] outline-none resize-y transition-[border-color] focus:border-accent-border shadow-md"
          />
          {isExtracting && (
            <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm rounded-2xl flex items-center justify-center text-[13px] text-accent gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span>Filtering slide junk lines & extracting clean speech text...</span>
            </div>
          )}
        </div>

        {wordCount > 0 && (
          <div className="mt-2.5 text-[12px] text-text3 flex items-center justify-between">
            <span>Word count: <strong className="text-text font-mono">{wordCount}</strong> words</span>
            <span>Est. duration at {targetWpm} WPM: <strong className="text-accent font-mono">~{estimatedMins} min</strong></span>
          </div>
        )}
      </div>

      {/* Pace Selector */}
      <div className="mb-9 p-6 bg-surface border border-border rounded-xl shadow-sm">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3 font-medium">
          Target Delivery Pace
        </div>
        <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
          {PACE_PRESETS.map((p) => (
            <button
              key={p.wpm}
              onClick={() => setTargetWpm(p.wpm)}
              className={`p-3.5 rounded-xl text-left font-sans transition-all cursor-pointer border ${
                targetWpm === p.wpm
                  ? 'bg-accent/15 border-accent text-accent font-medium shadow-md'
                  : 'bg-surface2 text-text2 border-border hover:border-border-hi'
              }`}
            >
              <div className="text-[14px] font-medium mb-0.5">{p.label}</div>
              <div className="text-[11px] text-text3">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <div ref={actionSectionRef} className="flex items-center gap-3 pt-2">
        <button
          onClick={handleStartScript}
          disabled={!scriptText.trim()}
          className={`inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-xl px-8 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-90 active:scale-[0.96] shadow-lg ${
            !scriptText.trim() ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          Start Teleprompter Rehearsal →
        </button>
      </div>
    </div>
  );
}
