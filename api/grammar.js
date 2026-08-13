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
    const { text } = req.body || {};
    if (!text) return res.status(200).json({ matches: [], score: 100 });

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

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length || 1;
    const errorCount = matches.length;
    const score = Math.max(20, Math.min(100, Math.round(100 - (errorCount / wordCount) * 100)));

    res.status(200).json({
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
    console.error('Vercel API grammar error:', err);
    res.status(200).json({ matches: [], score: 90, errorCount: 0 });
  }
}
