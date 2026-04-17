/**
 * apiClient.js — calls to the Express proxy for Claude API
 */

export async function polishTranscript(transcript, context) {
  try {
    const res = await fetch('/api/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, context }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.polished;
  } catch (err) {
    console.error('Polish API error:', err);
    // Fallback: basic filler removal
    const fillers = [/\bum\b/gi, /\buh\b/gi, /\blike\b/gi, /\byou know\b/gi, /\bbasically\b/gi, /\bactually\b/gi, /\bliterally\b/gi, /\bmatlab\b/gi, /\bhmm\b/gi, /\ber\b/gi];
    let pol = transcript;
    fillers.forEach((p) => { pol = pol.replace(p, ''); });
    return pol.replace(/\s{2,}/g, ' ').trim();
  }
}

export async function compareInsight(sessionA, sessionB) {
  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionA, sessionB }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.insight;
  } catch (err) {
    console.error('Compare API error:', err);
    // Fallback insight
    const delta = (sessionB.metrics?.overall || 0) - (sessionA.metrics?.overall || 0);
    if (delta > 0) {
      return `Your overall score improved by ${delta} points — that's real progress. Keep working on reducing filler words for even smoother delivery.`;
    }
    return `Your scores are close — consistency is key. Focus on one metric at a time, like reducing pauses, and you'll see compounding gains.`;
  }
}
