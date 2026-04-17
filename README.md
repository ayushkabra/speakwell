# Speakwell

**Speak freely. Sound sharp.** — A desktop-first speech practice platform that listens, analyses, and hands you back a polished version of yourself.

## Features

- 🎙 **Real-time speech-to-text** via Web Speech API (multilingual, auto-detect)
- 🤖 **AI-powered polished scripts** via Claude API (preserves your voice and language)
- 📊 **6-metric scoring** — Pace, Clarity, Flow, Fillers, Grammar, Pauses
- 📈 **Session comparison** with delta metrics and AI-generated insights
- 🌑 **Premium dark design** with grain texture, DM Serif Display + DM Sans typography
- 💾 **Persistent sessions** via localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Styling | TailwindCSS v4 |
| State | Zustand |
| Routing | React Router v6 |
| Speech | Web Speech API |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Backend | Express proxy server |

## Getting Started

### Prerequisites
- Node.js 18+
- Chrome or Edge (for Web Speech API)

### Setup

```bash
# Install dependencies
npm install

# Create .env file with your API key
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env
echo "PORT=3001" >> .env

# Run frontend only (Claude API uses fallback)
npm run dev

# Run frontend + API proxy
npm run dev:all
```

## Project Structure

```
src/
├── components/     # Topbar, MetricCard, WaveForm, ChipGrid, ScoreHero, Tooltip
├── pages/          # Home, Context, Record, Processing, Results, Compare
├── store/          # Zustand session store with localStorage
├── lib/            # speechEngine, metricsEngine, apiClient
└── index.css       # TailwindCSS v4 theme tokens + animations
```

## License

MIT
