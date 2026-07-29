import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// POST /api/polish — generate polished script from raw transcript
app.post('/api/polish', async (req, res) => {
  try {
    const { transcript, context } = req.body;
    if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: `You are a speech coach. You do NOT give advice or solutions. Your only job is to rewrite the user's spoken words in a cleaner, more confident version that preserves their voice and language. If they spoke in Hindi, rewrite in Hindi. If they code-switched, preserve that. Do not add new ideas. Do not solve their problem. Just say the same thing, better.`,
        messages: [
          {
            role: 'user',
            content: `Context: ${context || 'Free Talk'}. Raw transcript: ${transcript}. Rewrite this in the user's voice.`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const polished = data.content?.[0]?.text || '';
    res.json({ polished });
  } catch (err) {
    console.error('Polish API error:', err);
    res.status(500).json({ error: 'Failed to generate polished script' });
  }
});

// POST /api/compare — generate insight comparing two sessions
app.post('/api/compare', async (req, res) => {
  try {
    const { sessionA, sessionB } = req.body;
    if (!sessionA || !sessionB) return res.status(400).json({ error: 'Two sessions required' });

    const summary = (s) =>
      `${s.context} session (${s.date}): Overall ${s.metrics.overall}, WPM ${s.metrics.wpm}, Clarity ${s.metrics.clarity}, Flow ${s.metrics.flow}, Fillers ${s.metrics.fillers}, Grammar errors ${s.metrics.grammar}, Pauses ${s.metrics.pauses}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 256,
        system: `You are a warm, honest speech coach. Given two session summaries, give ONE specific observation about what improved and ONE thing to still work on. Two sentences max. Be direct, not generic.`,
        messages: [
          {
            role: 'user',
            content: `Session A: ${summary(sessionA)}\nSession B: ${summary(sessionB)}\nCompare these two sessions.`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const insight = data.content?.[0]?.text || '';
    res.json({ insight });
  } catch (err) {
    console.error('Compare API error:', err);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

// POST /api/extract-questions — AI document question extractor
app.post('/api/extract-questions', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) return res.status(400).json({ error: 'No document text provided' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: `You are a document analyzer. Read the provided text and extract ONLY practice or interview questions from it. Return a raw JSON array of strings: ["Question 1", "Question 2", ...]. Do not include markdown codeblocks or explanation. Return JSON array only.`,
        messages: [
          {
            role: 'user',
            content: `Extract practice questions from this text:\n\n${documentText.slice(0, 4000)}`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawContent = data.content?.[0]?.text || '[]';
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ questions });
  } catch (err) {
    console.error('Extract Questions API error:', err);
    res.status(500).json({ error: 'Failed to extract questions from document' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API proxy running on http://localhost:${PORT}`));
