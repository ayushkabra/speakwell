import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Helper function to call Groq Chat API (100% Free Tier)
async function callGroq(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Groq API Error');

  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

// Helper function to call Anthropic Claude API
async function callClaude(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Claude API Error');

  const rawContent = data.content?.[0]?.text || '{}';
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { polished: rawContent };
}

// POST /api/polish — generate authentic script, master speech script, coaching tips, & thought blueprint
app.post('/api/polish', async (req, res) => {
  try {
    const { transcript, context } = req.body;
    if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

    const systemPrompt = `You are an elite speechwriter and master speaker.
Given a user's spoken transcript and topic, produce TWO distinct scripts and actionable coaching feedback:

1. "polished": Authentic De-Cluttered Script. Preserve 100% of the user's exact personal voice, vocabulary, stories, and tone. Remove filler words ("um", "uh", "like", "you know", "basically"), false starts, and stuttered restarts. DO NOT use robotic corporate AI jargon ("synergistic", "delve into", "in today's landscape").

2. "masterScript": Ideal Master Speech Script ON THIS EXACT TOPIC.
   CRITICAL RULES FOR "masterScript":
   - Write a REAL, HIGH-IMPACT, TOPIC-SPECIFIC SPOKEN SPEECH SCRIPT that someone would actually deliver on stage or in a meeting.
   - ABSOLUTELY NO META-TEXT OR BOILERPLATE (Never write generic lines like "On the topic of X, the core argument centers on...").
   - DIVE DIRECTLY INTO THE REAL SUBJECT MATTER with concrete arguments, vivid analogies, specific examples, and actionable solutions.
   - Format with markdown headers:
     **📌 Opening Hook & Thesis**
     **💡 Core Argument 1: [Specific Point]**
     **🎯 Real-World Evidence & Impact**
     **🏁 High-Impact Closing**

3. "coachingTips": Array of 3-4 specific, actionable coaching points on what the user could have spoken better on this topic.

4. "structuralMapping": Object with keys point, reason, example, conclusion summarizing their spoken thoughts.

5. "strongestPoint": The single most compelling sentence from their original speech.

Return ONLY a raw JSON object with keys: polished, masterScript, coachingTips (array), structuralMapping (object), strongestPoint.`;

    const userPrompt = `Topic / Context: ${context || 'Free Talk'}. User's spoken transcript:\n${transcript}\n\nWrite a real, compelling master speech script directly addressing "${context || 'this topic'}" with concrete arguments and zero generic boilerplate text.`;

    let parsed = {};
    if (GROQ_API_KEY) {
      try {
        parsed = await callGroq(systemPrompt, userPrompt);
      } catch (err) {
        console.warn('Groq API failed, falling back to Anthropic/local:', err.message);
        if (ANTHROPIC_API_KEY) {
          parsed = await callClaude(systemPrompt, userPrompt);
        }
      }
    } else if (ANTHROPIC_API_KEY) {
      parsed = await callClaude(systemPrompt, userPrompt);
    } else {
      throw new Error('No AI provider API key configured on backend');
    }

    res.json({
      polished: parsed.polished || transcript,
      masterScript: parsed.masterScript || '',
      coachingTips: parsed.coachingTips || [],
      structuralMapping: parsed.structuralMapping || null,
      strongestPoint: parsed.strongestPoint || null,
    });
  } catch (err) {
    console.error('Polish API error:', err);
    res.status(500).json({ error: 'Failed to generate polished script', details: err.message });
  }
});

// POST /api/grammar — LanguageTool Free Public API Proxy Endpoint
app.post('/api/grammar', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ matches: [], score: 100 });

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');

    const ltRes = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const ltData = await ltRes.json();
    const matches = ltData.matches || [];

    // Calculate real grammar precision score (100 - weighted error count)
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length || 1;
    const errorCount = matches.length;
    const score = Math.max(20, Math.min(100, Math.round(100 - (errorCount / wordCount) * 100)));

    res.json({
      matches: matches.map((m) => ({
        message: m.message,
        shortMessage: m.shortMessage,
        offset: m.offset,
        length: m.length,
        replacements: (m.replacements || []).slice(0, 3).map((r) => r.value),
      })),
      score,
      errorCount,
    });
  } catch (err) {
    console.error('Grammar check error:', err);
    res.json({ matches: [], score: 90, errorCount: 0 });
  }
});

// POST /api/whisper — Groq Whisper Audio Transcription Endpoint (Free Tier)
app.post('/api/whisper', async (req, res) => {
  try {
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

    // Expect raw audio binary or base64 in body
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'No audio data provided' });

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
    formData.append('file', blob, 'recording.webm');
    formData.append('model', 'whisper-large-v3-turbo');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    const groqData = await groqRes.json();
    if (groqData.error) throw new Error(groqData.error.message);

    res.json({ text: groqData.text || '' });
  } catch (err) {
    console.error('Groq Whisper error:', err);
    res.status(500).json({ error: 'Whisper transcription failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Speakwell $0 API Proxy running on http://localhost:${PORT}`));
