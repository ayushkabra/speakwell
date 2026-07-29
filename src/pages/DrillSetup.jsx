import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { PRESET_PACKS, parseQuestionsFromText, parseQuestionsFromFile } from '../lib/questionParser';

const TIMER_OPTIONS = [
  { label: 'No timer', value: 0 },
  { label: '30 sec', value: 30 },
  { label: '60 sec', value: 60 },
  { label: '90 sec', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
];

export default function DrillSetup() {
  const navigate = useNavigate();
  const setDrillSetup = useSessionStore((s) => s.setDrillSetup);

  const [activeTab, setActiveTab] = useState('type'); // 'type' | 'upload' | 'presets'

  // Tab 1: Itemized Questions list (Q1, Q2, Q3...)
  const [questionItems, setQuestionItems] = useState([
    { id: 'q-1', text: '' },
    { id: 'q-2', text: '' },
    { id: 'q-3', text: '' },
  ]);

  // Tab 2: PDF Upload & Interactive Review
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [extractedPdfQuestions, setExtractedPdfQuestions] = useState([]);
  const fileInputRef = useRef(null);

  // Tab 3: Selected Preset
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Global Response Timer per question
  const [selectedTimer, setSelectedTimer] = useState(60);

  // Quick bulk paste modal state
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // ----------------------------------------------------
  // ITEMIZED QUESTION ACTIONS (Tab 1)
  // ----------------------------------------------------
  const handleQuestionTextChange = (id, newText) => {
    setQuestionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleAddQuestionField = () => {
    setQuestionItems((prev) => [
      ...prev,
      { id: `q-${Date.now()}-${prev.length + 1}`, text: '' },
    ]);
  };

  const handleRemoveQuestionField = (id) => {
    if (questionItems.length <= 1) {
      setQuestionItems([{ id: 'q-1', text: '' }]);
      return;
    }
    setQuestionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBulkImport = () => {
    const parsed = parseQuestionsFromText(bulkText);
    if (parsed.length > 0) {
      setQuestionItems(
        parsed.map((qText, idx) => ({ id: `q-bulk-${idx}`, text: qText }))
      );
    }
    setShowBulkPasteModal(false);
    setBulkText('');
  };

  // ----------------------------------------------------
  // PRESET PACK ACTIONS (Tab 3)
  // ----------------------------------------------------
  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
  };

  const handleClearPreset = () => {
    setSelectedPreset(null);
  };

  // ----------------------------------------------------
  // PDF UPLOAD & QUESTION REVIEW (Tab 2)
  // ----------------------------------------------------
  const handleFileSelect = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    try {
      const extracted = await parseQuestionsFromFile(file);
      setExtractedPdfQuestions(
        extracted.map((q, idx) => ({ id: `pdf-${idx}`, text: q, checked: true }))
      );
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const togglePdfQuestionChecked = (id) => {
    setExtractedPdfQuestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePdfQuestionTextChange = (id, newText) => {
    setExtractedPdfQuestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleRemovePdfQuestion = (id) => {
    setExtractedPdfQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  // ----------------------------------------------------
  // FINAL QUESTION COMPOSER
  // ----------------------------------------------------
  const getActiveQuestions = () => {
    if (activeTab === 'type') {
      return questionItems.map((item) => item.text.trim()).filter((t) => t.length > 0);
    }
    if (activeTab === 'upload') {
      return extractedPdfQuestions
        .filter((item) => item.checked && item.text.trim().length > 0)
        .map((item) => item.text.trim());
    }
    if (activeTab === 'presets' && selectedPreset) {
      return selectedPreset.questions;
    }
    return [];
  };

  const activeQuestions = getActiveQuestions();

  const handleStartDrill = () => {
    if (activeQuestions.length === 0) return;
    setDrillSetup({
      questions: activeQuestions,
      timerSecs: selectedTimer,
    });
    navigate('/drill-record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[780px] mx-auto px-6 pt-12 pb-20 max-[680px]:px-5">
      {/* Top Header & Cancel/Exit */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none p-0"
        >
          ← Exit & Back to Home
        </button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-2">
          Question Drill Setup
        </div>
        <h2 className="font-serif text-[36px] leading-[1.12] font-normal mb-2.5 max-[680px]:text-[28px]">
          Create your <em className="italic text-accent">Practice Session</em>
        </h2>
        <p className="text-[14px] text-text2 leading-[1.6]">
          Add questions individually, upload a document with interactive filtering, or pick a curated interview preset.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-b-border mb-7 flex-wrap">
        <button
          onClick={() => setActiveTab('type')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'type'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          ✏️ Itemized Questions
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'upload'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          📄 PDF / Document Filter
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`pb-3 px-4 font-sans text-[13px] font-medium transition-all cursor-pointer bg-transparent border-b-2 ${
            activeTab === 'presets'
              ? 'border-accent text-accent'
              : 'border-transparent text-text3 hover:text-text2'
          }`}
        >
          🎯 Interview Presets
        </button>
      </div>

      {/* TAB 1: ITEMIZED QUESTIONS (Question 1, Question 2, Question 3...) */}
      {activeTab === 'type' && (
        <div className="mb-9">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] tracking-[0.15em] uppercase text-text3">
              Add your questions line by line
            </div>
            <button
              onClick={() => setShowBulkPasteModal(true)}
              className="text-[12px] text-accent hover:underline cursor-pointer bg-transparent border-none p-0 font-medium"
            >
              📋 Bulk paste questions
            </button>
          </div>

          <div className="space-y-3.5 mb-5">
            {questionItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 px-4 bg-surface border border-border-md rounded-xl transition-all focus-within:border-accent-border"
              >
                <span className="w-7 h-7 rounded-full bg-surface2 border border-border text-accent font-serif text-[13px] font-medium flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                  placeholder={`Question ${idx + 1} (e.g. Tell me about a time you solved a complex problem)`}
                  className="w-full bg-transparent font-sans text-[14px] text-text outline-none placeholder:text-text3"
                />
                <button
                  onClick={() => handleRemoveQuestionField(item.id)}
                  title="Remove question"
                  className="text-text3 hover:text-red-400 text-[16px] cursor-pointer bg-transparent border-none px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddQuestionField}
            className="inline-flex items-center gap-2 text-[13px] text-accent bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 cursor-pointer font-medium hover:bg-accent/20 transition-all"
          >
            + Add Question {questionItems.length + 1}
          </button>
        </div>
      )}

      {/* TAB 2: PDF UPLOAD & INTERACTIVE QUESTION FILTER */}
      {activeTab === 'upload' && (
        <div className="mb-9">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-surface border-2 border-dashed border-border-md rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 hover:border-accent-border hover:bg-surface2 mb-6"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pdf,.txt,.md"
              className="hidden"
            />
            <div className="text-[36px] mb-2">📄</div>
            <div className="text-[15px] text-text font-medium mb-1">
              {fileName ? fileName : 'Upload PDF or Document'}
            </div>
            <div className="text-[12px] text-text3 max-w-[400px] mx-auto">
              {isParsing
                ? 'Parsing document and isolating questions...'
                : 'Upload your document. We will filter out body paragraphs and isolate the questions for review.'}
            </div>
          </div>

          {/* Interactive Question Filter List */}
          {extractedPdfQuestions.length > 0 && (
            <div className="p-5 bg-surface border border-border-md rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                  Extracted Questions ({extractedPdfQuestions.filter((q) => q.checked).length} selected)
                </div>
                <div className="text-[12px] text-text3">Uncheck or edit non-question lines</div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {extractedPdfQuestions.map((qItem, idx) => (
                  <div
                    key={qItem.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      qItem.checked ? 'bg-surface2/60 border-border' : 'bg-surface/30 border-transparent opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={qItem.checked}
                      onChange={() => togglePdfQuestionChecked(qItem.id)}
                      className="mt-1 cursor-pointer accent-amber-400"
                    />
                    <input
                      type="text"
                      value={qItem.text}
                      onChange={(e) => handlePdfQuestionTextChange(qItem.id, e.target.value)}
                      className="w-full bg-transparent font-sans text-[13px] text-text outline-none"
                    />
                    <button
                      onClick={() => handleRemovePdfQuestion(qItem.id)}
                      className="text-text3 hover:text-red-400 text-[14px] cursor-pointer bg-transparent border-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRESET PACKS (WITH EASY CLEAR & EXIT) */}
      {activeTab === 'presets' && (
        <div className="mb-9">
          {selectedPreset ? (
            <div className="p-6 bg-surface border border-accent rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[26px]">{selectedPreset.icon}</span>
                  <div>
                    <h3 className="font-serif text-[20px] text-text">{selectedPreset.title}</h3>
                    <p className="text-[12px] text-text3">{selectedPreset.description}</p>
                  </div>
                </div>
                <button
                  onClick={handleClearPreset}
                  className="text-[12px] text-accent hover:underline bg-transparent border-none cursor-pointer font-medium"
                >
                  ← Choose another pack
                </button>
              </div>

              <div className="text-[11px] text-text3 uppercase tracking-wider mb-2">
                Included Questions ({selectedPreset.questions.length}):
              </div>
              <ol className="list-decimal list-inside text-[14px] text-text2 space-y-2 pl-1">
                {selectedPreset.questions.map((q, idx) => (
                  <li key={idx} className="leading-[1.5]">
                    "{q}"
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
              {PRESET_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  onClick={() => handleSelectPreset(pack)}
                  className="p-5 rounded-2xl border bg-surface border-border hover:border-accent-border hover:bg-surface2 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[24px]">{pack.icon}</span>
                    <span className="text-[12px] text-accent font-medium group-hover:translate-x-1 transition-transform">
                      Select →
                    </span>
                  </div>
                  <div className="text-[15px] font-medium text-text mb-1">{pack.title}</div>
                  <div className="text-[12px] text-text3 mb-3 leading-[1.5]">{pack.description}</div>
                  <div className="text-[11px] text-accent font-medium">
                    {pack.questions.length} Questions
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Response Timer Configuration */}
      <div className="mb-9 p-5 bg-surface border border-border rounded-xl">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3">
          Response Timer per Question
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedTimer(opt.value)}
              className={`px-4 py-2 rounded-lg text-[13px] font-sans transition-all cursor-pointer border ${
                selectedTimer === opt.value
                  ? 'bg-accent text-[#0e0e0d] border-accent font-medium'
                  : 'bg-transparent text-text2 border-border-md hover:border-border-hi hover:text-text font-light'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA Button & Ready Summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <button
          onClick={handleStartDrill}
          disabled={activeQuestions.length === 0}
          className={`inline-flex items-center gap-2 rounded-[10px] px-8 py-3.5 font-sans text-[14px] font-medium transition-all duration-[180ms] ${
            activeQuestions.length > 0
              ? 'bg-accent text-[#0e0e0d] cursor-pointer hover:opacity-86 active:scale-[0.96]'
              : 'bg-surface2 text-text3 cursor-not-allowed border border-border'
          }`}
        >
          Start Question Drill ({activeQuestions.length} Questions) →
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none"
        >
          Cancel & Exit
        </button>
      </div>

      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-md rounded-2xl w-full max-w-[540px] p-6 animate-fade-up">
            <h3 className="font-serif text-[22px] text-text mb-2">Bulk Paste Questions</h3>
            <p className="text-[13px] text-text3 mb-4">
              Paste questions below (one per line). We will convert each line into an individual itemized input field.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="1. What is your leadership style?&#10;2. How do you handle high pressure?&#10;3. What are your long-term goals?"
              rows="6"
              className="w-full bg-surface2 border border-border-md rounded-xl p-4 font-sans text-[14px] text-text outline-none resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkPasteModal(false)}
                className="px-4 py-2 text-[13px] text-text3 hover:text-text cursor-pointer bg-transparent border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="px-6 py-2.5 bg-accent text-[#0e0e0d] font-medium rounded-xl text-[13px] cursor-pointer"
              >
                Import Questions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
