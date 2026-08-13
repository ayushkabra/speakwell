import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { sessionA, sessionB } = req.body || {};
    if (!sessionA || !sessionB) return res.status(400).json({ error: 'Two sessions required' });

    const summary = (s) =>
      `${s.context} session (${s.date}): Overall ${s.metrics?.overall}, WPM ${s.metrics?.wpm}, Clarity ${s.metrics?.clarity}, Flow ${s.metrics?.flow}, Fillers ${s.metrics?.fillers}, Grammar errors ${s.metrics?.grammar}, Pauses ${s.metrics?.pauses}`;

    const systemPrompt = `You are a warm, authentic speech guide. Given two session summaries, give ONE specific observation about what improved in their speech structure and ONE gentle focus tip for next time. Two sentences max. Be encouraging and authentic.`;
    const userPrompt = `Session A: ${summary(sessionA)}\nSession B: ${summary(sessionB)}\nCompare these two sessions.`;

    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        max_tokens: 256,
      }),
    });

    const data = await groqRes.json();
    if (data.error) throw new Error(data.error.message);

    const insight = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ insight });
  } catch (err) {
    console.error('Vercel compare error:', err);
    res.status(500).json({ error: 'Failed to generate comparison insight', details: err.message });
  }
}
