import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

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
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

    const { audioBase64, mimeType } = req.body || {};
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

    res.status(200).json({ text: groqData.text || '' });
  } catch (err) {
    console.error('Vercel Whisper error:', err);
    res.status(500).json({ error: 'Whisper transcription failed', details: err.message });
  }
}
