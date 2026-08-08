import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// POST /api/polish — generate structured authentic polished script & thought blueprint mapping
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
        system: `You are an authentic speech guide and communication architect.
Your goal is to hear the user's spoken thoughts, preserve 100% of their authentic personal voice, vocabulary, and intent, while removing verbal clutter and revealing the clean mental structure of their ideas.

CRITICAL VOICE & AUTHENTICITY RULES:
1. PRESERVE THE USER'S EXACT WORDS, STORIES, PERSONAL PHRASING, AND TONE. Do not fabricate new facts or change their personal style.
2. DO NOT USE ROBOTIC CORPORATE AI JARGON ("in today's fast-paced landscape", "synergistic", "delve into", "leverage"). Keep it 100% natural and authentic to the user.
3. STRIP VERBAL CLUTTER: Remove fillers ("um", "uh", "like", "you know", "basically", "matlab", "arre"), false starts, stuttered restarts, and trailing thoughts.
4. STRUCTURE:
   - For Question Drills / Slide Decks / Frameworks: Keep clear headers (e.g. **Question 1: ...** or **Slide 1: ...**) with clean spoken answers.
   - For Free Talk: Organize into punchy, articulate paragraphs with a strong opening hook and clear closing statement.

Return ONLY a raw JSON object with keys:
{
  "polished": "The de-cluttered authentic script preserving the user's exact words",
  "structuralMapping": {
    "point": "One-sentence summary of the core point stated by the user",
    "reason": "The main rationale or justification provided",
    "example": "The supporting detail, story, or evidence mentioned",
    "conclusion": "The concluding takeaway or action item"
  },
  "strongestPoint": "The single most compelling or punchy sentence from their speech"
}
Do not include markdown codeblocks or extra text outside JSON.`,
        messages: [
          {
            role: 'user',
            content: `Context: ${context || 'Free Talk'}. Raw spoken transcript:\n${transcript}\n\nDe-clutter and structure this while keeping 100% of the user's authentic voice.`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawContent = data.content?.[0]?.text || '{}';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    let parsed = {};
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = { polished: rawContent };
      }
    } else {
      parsed = { polished: rawContent };
    }

    res.json({
      polished: parsed.polished || rawContent,
      structuralMapping: parsed.structuralMapping || null,
      strongestPoint: parsed.strongestPoint || null,
    });
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
        system: `You are a warm, authentic speech guide. Given two session summaries, give ONE specific observation about what improved in their speech structure and ONE gentle focus tip for next time. Two sentences max. Be encouraging and authentic.`,
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

// POST /api/generate-ladder-question — AI progressive topic question generator
app.post('/api/generate-ladder-question', async (req, res) => {
  try {
    const { domain, level, previousQuestions } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    const prevList = (previousQuestions || []).join('\n- ');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: `You are an authentic speech guide creating a progressive difficulty topic ladder.
Generate a single speech prompt for Domain: "${domain}" at Difficulty Level ${level || 1}.

Guidelines for Level Progression:
- Level 1: Warm-up / Easy personal memory or favorite aspect.
- Level 2: Deep Analysis / Medium — requires structured reasoning or trade-off evaluation.
- Level 3: High-Stakes Debate / Hard — requires handling counter-arguments or controversy.
- Level 4: Complex Ethics / Policy — structural dilemmas and long-term implications.
- Level 5+: Mastermind Challenge — radical restructuring, crisis scenarios, or deep domain edge cases.

Return ONLY a raw JSON object with keys:
{
  "questionText": "The question string here",
  "hint": "Short 1-sentence tip on how to structure the answer"
}
Do not include markdown codeblocks or extra text.`,
        messages: [
          {
            role: 'user',
            content: `Domain: ${domain}\nTarget Level: ${level}\nPrevious questions asked so far:\n- ${prevList || 'None'}\n\nGenerate Level ${level} question:`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawContent = data.content?.[0]?.text || '{}';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({
      questionText: parsed.questionText || '',
      hint: parsed.hint || '',
    });
  } catch (err) {
    console.error('Generate Ladder Question API error:', err);
    res.status(500).json({ error: 'Failed to generate progressive question' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API proxy running on http://localhost:${PORT}`));
