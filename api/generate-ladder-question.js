import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { domain, level, previousQuestions } = req.body || {};
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    const prevList = (previousQuestions || []).join('\n- ');

    const systemPrompt = `You are an authentic speech guide creating a progressive difficulty topic ladder.
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
}`;

    const userPrompt = `Domain: ${domain}\nTarget Level: ${level}\nPrevious questions asked so far:\n- ${prevList || 'None'}\n\nGenerate Level ${level} question:`;

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
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await groqRes.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    res.status(200).json({
      questionText: parsed.questionText || '',
      hint: parsed.hint || '',
    });
  } catch (err) {
    console.error('Vercel generate ladder question error:', err);
    res.status(500).json({ error: 'Failed to generate progressive ladder question', details: err.message });
  }
}
