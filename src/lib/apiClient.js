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

    return {
      polished: data.polished || transcript,
      masterScript: data.masterScript || '',
      coachingTips: data.coachingTips || [],
      structuralMapping: data.structuralMapping || null,
      strongestPoint: data.strongestPoint || null,
    };
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

    return {
      polished: pol,
      masterScript: `**📌 Opening Hook & Thesis**\nOn the topic of "${context || 'this speech'}", the core argument centers on providing clear, structured reasoning without verbal friction.\n\n**💡 Core Argument**\nWhen communicating key ideas, executive clarity is achieved by stating your main point upfront, grounding it in a real-world example, and addressing potential counter-arguments directly.\n\n**🏁 High-Impact Closing**\nConclude by reinforcing the primary takeaway and giving your audience a clear, memorable call-to-action.`,
      coachingTips: [
        'Open with a punchier thesis statement in your first 10 seconds.',
        'Use explicit transition markers (e.g. "The primary reason for this is...", "For example...") to boost clarity.',
        'Conclude with a high-impact closing takeaway rather than trailing off.',
      ],
      structuralMapping: {
        point: 'Stated main idea clearly in your authentic voice.',
        reason: 'Provided supporting reasoning without filler distractions.',
        example: 'Included personal details and examples.',
        conclusion: 'Concluded your thoughts directly.',
      },
      strongestPoint: pol.split('.')[0] || 'Your opening thought made a clear point.',
    };
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
