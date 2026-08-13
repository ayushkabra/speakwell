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
    const { transcript, context } = req.body || {};
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

    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured on backend');

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
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await groqRes.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    res.status(200).json({
      polished: parsed.polished || transcript,
      masterScript: parsed.masterScript || '',
      coachingTips: parsed.coachingTips || [],
      structuralMapping: parsed.structuralMapping || null,
      strongestPoint: parsed.strongestPoint || null,
    });
  } catch (err) {
    console.error('Vercel polish API error:', err);
    res.status(500).json({ error: 'Failed to generate polished script', details: err.message });
  }
}
