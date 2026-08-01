/**
 * apiClient.js — calls to the Express proxy for Claude API with reliable fallback
 */

export async function polishTranscript(transcript, context) {
  try {
    let res = await fetch('/api/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, context }),
    });

    if (!res.ok && res.status === 404) {
      res = await fetch('http://localhost:3001/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context }),
      });
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.polished;
  } catch (err) {
    console.error('Polish API error:', err);
    // Fallback filler removal & structure formatting
    const fillers = [
      /\bum\b/gi, /\buh\b/gi, /\blike\b/gi, /\byou know\b/gi,
      /\bbasically\b/gi, /\bactually\b/gi, /\bliterally\b/gi,
      /\bmatlab\b/gi, /\barre\b/gi, /\bhmm\b/gi, /\ber\b/gi
    ];
    let pol = transcript;
    fillers.forEach((p) => { pol = pol.replace(p, ''); });
    pol = pol.replace(/\s{2,}/g, ' ').trim();

    if (pol.includes('Q1') || pol.includes('Q2')) {
      return pol.replace(/(Q\d+ \([^)]+\):)/g, '\n\n**$1**\n• ');
    }
    return pol;
  }
}

export async function compareInsight(sessionA, sessionB) {
  try {
    let res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionA, sessionB }),
    });

    if (!res.ok && res.status === 404) {
      res = await fetch('http://localhost:3001/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionA, sessionB }),
      });
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.insight;
  } catch (err) {
    console.error('Compare API error:', err);
    const delta = (sessionB.metrics?.overall || 0) - (sessionA.metrics?.overall || 0);
    if (delta > 0) {
      return `Your overall score improved by ${delta} points — that's real progress. Keep working on reducing filler words for even smoother delivery.`;
    }
    return `Your scores are close — consistency is key. Focus on one metric at a time, like reducing pauses, and you'll see compounding gains.`;
  }
}

export async function fetchLadderQuestion(domain, level, previousQuestions = []) {
  try {
    let res = await fetch('/api/generate-ladder-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, level, previousQuestions }),
    });

    if (!res.ok && res.status === 404) {
      res = await fetch('http://localhost:3001/api/generate-ladder-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, level, previousQuestions }),
      });
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.error('Fetch ladder question error:', err);
    return null;
  }
}
