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
    const { documentText } = req.body || {};
    if (!documentText) return res.status(400).json({ error: 'No document text provided' });

    const systemPrompt = `You are a document analyzer. Read the provided text and extract ONLY practice or interview questions from it. Return a raw JSON array of strings: ["Question 1", "Question 2", ...]. Return JSON array only.`;
    const userPrompt = `Extract practice questions from this text:\n\n${documentText.slice(0, 4000)}`;

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
        temperature: 0.3,
      }),
    });

    const data = await groqRes.json();
    if (data.error) throw new Error(data.error.message);

    const rawContent = data.choices?.[0]?.message?.content || '[]';
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.status(200).json({ questions });
  } catch (err) {
    console.error('Vercel extract-questions error:', err);
    res.status(500).json({ error: 'Failed to extract questions from document', details: err.message });
  }
}
