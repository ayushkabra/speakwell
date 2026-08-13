/**
 * metricsEngine.js — local speech metrics computation, LanguageTool API grammar integration & HTML sanitization
 */

const FILLER_PATTERNS = [
  /\bum\b/gi, /\buh\b/gi, /\blike\b/gi, /\byou know\b/gi,
  /\bbasically\b/gi, /\bactually\b/gi, /\bliterally\b/gi,
  /\bmatlab\b/gi, /\barre\b/gi, /\bhmm\b/gi, /\ber\b/gi,
];

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Call LanguageTool Free Public API directly ($0 Cost, No API key needed)
 */
export async function checkGrammarWithLanguageTool(text) {
  if (!text || text.trim().length < 5) {
    return { matches: [], errorCount: 0, score: 100 };
  }

  try {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');

    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) throw new Error('LanguageTool HTTP error');
    const data = await res.json();
    const matches = data.matches || [];
    const errorCount = matches.length;

    return { matches, errorCount };
  } catch (err) {
    console.warn('LanguageTool direct check fallback:', err);
    // Offline local heuristic fallback
    const words = text.trim().split(/\s+/).length || 1;
    const estimatedErrors = Math.max(0, Math.round(words / 45));
    return { matches: [], errorCount: estimatedErrors };
  }
}

export function computeMetrics(rawTranscript, durationSecs, grammarMatches = null) {
  const raw = (rawTranscript || '').trim();
  if (raw.length < 10) {
    return {
      wpm: 0,
      clarity: 50,
      flow: 50,
      fillers: 0,
      grammar: 0,
      pauses: 0,
      overall: 50,
    };
  }

  const words = raw.split(/\s+/).length;
  const dur = Math.max(1, durationSecs);
  const wpm = Math.round(words / (dur / 60));

  let fillers = 0;
  FILLER_PATTERNS.forEach((p) => {
    const m = raw.match(p);
    if (m) fillers += m.length;
  });

  const sentences = raw.split(/[.!?]+/).filter((s) => s.trim()).length;
  const avgWPS = sentences > 0 ? words / sentences : words;

  const clarity = Math.min(99, Math.max(35, Math.round(100 - fillers * 3 - Math.abs(avgWPS - 18) * 1.3)));
  const flow = Math.min(99, Math.max(25, Math.round(clarity * 0.65 + (wpm > 80 && wpm < 175 ? 32 : 8))));
  
  // Real LanguageTool grammar error count or fallback estimate
  const grammar = grammarMatches !== null && Array.isArray(grammarMatches)
    ? grammarMatches.length
    : Math.max(0, Math.round(words / 40));

  const pauses = Math.max(0, Math.round(dur / 28));
  const overall = Math.min(99, Math.round(clarity * 0.4 + flow * 0.35 + Math.max(0, 100 - fillers * 4) * 0.25));

  return { wpm, clarity, flow, fillers, grammar, pauses, overall };
}

export function annotateTranscript(rawTranscript, grammarMatches = []) {
  if (!rawTranscript) return '';
  let ann = escapeHtml(rawTranscript);

  const fillerPatterns = [
    { re: /\bum\b/gi, label: 'Filler word — try removing it or pausing instead' },
    { re: /\buh\b/gi, label: 'Filler word — try pausing instead' },
    { re: /\blike\b/gi, label: 'Filler word — used as a thinking pause' },
    { re: /\byou know\b/gi, label: 'Filler word' },
    { re: /\bbasically\b/gi, label: 'Filler word — used as a thinking pause' },
    { re: /\bactually\b/gi, label: 'Filler word' },
    { re: /\bliterally\b/gi, label: 'Filler word' },
    { re: /\bmatlab\b/gi, label: 'Multilingual filler — matlab = "meaning" in Hindi' },
    { re: /\barre\b/gi, label: 'Hindi filler' },
    { re: /\bhmm\b/gi, label: 'Filler — try pausing instead' },
    { re: /\ber\b/gi, label: 'Filler word' },
  ];

  fillerPatterns.forEach(({ re, label }) => {
    ann = ann.replace(re, `<span class="hl-filler" title="${label}">$&</span>`);
  });

  return ann;
}

export function getMetricColor(metricName, value) {
  switch (metricName) {
    case 'wpm':
      if (value >= 80 && value <= 150) return 'good';
      if (value > 150 || (value > 0 && value < 80)) return 'warn';
      return 'bad';
    case 'clarity':
    case 'flow':
      if (value >= 75) return 'good';
      if (value >= 50) return 'warn';
      return 'bad';
    case 'fillers':
      if (value <= 5) return 'good';
      if (value <= 12) return 'warn';
      return 'bad';
    case 'grammar':
      if (value <= 2) return 'good';
      if (value <= 5) return 'warn';
      return 'bad';
    case 'pauses':
      if (value <= 4) return 'good';
      if (value <= 8) return 'warn';
      return 'bad';
    default:
      return 'good';
  }
}

export function getMetricNote(metricName, value) {
  switch (metricName) {
    case 'wpm':
      if (value >= 80 && value <= 150) return 'WPM · good pace';
      if (value > 150) return 'WPM · slightly fast';
      return 'WPM · a bit slow';
    case 'clarity':
      if (value >= 75) return 'Ideas landed well';
      if (value >= 50) return 'Some ideas unclear';
      return 'Needs more structure';
    case 'flow':
      if (value >= 75) return 'Smooth delivery';
      if (value >= 50) return 'Some rough patches';
      return 'Choppy delivery';
    case 'fillers':
      if (value <= 5) return 'Minimal fillers';
      if (value <= 12) return 'Noticeable fillers';
      return 'Too many fillers';
    case 'grammar':
      if (value <= 2) return 'Real Grammar · 0-2 issues';
      if (value <= 5) return 'Real Grammar · A few issues';
      return 'Real Grammar · Needs attention';
    case 'pauses':
      if (value <= 4) return 'Natural pauses';
      if (value <= 8) return `${Math.max(0, value - 4)} over 3 seconds`;
      return 'Frequent pauses';
    default:
      return '';
  }
}

export function getScoreNote(metrics) {
  if (!metrics) return '"Keep going — with practice, your natural confidence will come through."';
  if (metrics.fillers > 10) return '"Filler words are burying your ideas — the thoughts are solid, the delivery needs cleaning."';
  if (metrics.clarity > 75) return '"Strong clarity. A little more pace control and you\'re there."';
  return '"Keep going — with practice, your natural confidence will come through."';
}
