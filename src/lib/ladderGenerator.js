/**
 * ladderGenerator.js — Pre-built domain progressive question banks & tier metadata
 */

export const DOMAIN_PRESETS = [
  { id: 'sports', icon: '⚽', label: 'Sports & Athletics', hint: 'From favorite games to sports business & tech' },
  { id: 'tech', icon: '🤖', label: 'Tech & AI', hint: 'From everyday apps to AI ethics & deep tech' },
  { id: 'business', icon: '💼', label: 'Startup & Business Strategy', hint: 'From pitch ideas to crisis management' },
  { id: 'product', icon: '🎯', label: 'Product Management & UX', hint: 'From favorite features to trade-offs & roadmap' },
  { id: 'leadership', icon: '🗣️', label: 'Behavioral & Leadership', hint: 'From teamwork to high-stakes conflict resolution' },
  { id: 'entertainment', icon: '🎬', label: 'Pop Culture & Media', hint: 'From movies to streaming economics & culture' },
];

export function getTierMetadata(level) {
  if (level === 1) {
    return {
      title: 'Level 1 · Warm-Up',
      badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
      description: 'Low-stakes personal memory or introductory observation.',
    };
  }
  if (level === 2) {
    return {
      title: 'Level 2 · Deep Analysis',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      description: 'Requires structured opinion, trade-offs, and logical flow.',
    };
  }
  if (level === 3) {
    return {
      title: 'Level 3 · High-Stakes Debate',
      badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
      description: 'Complex counter-arguments, handling controversy, and nuance.',
    };
  }
  if (level === 4) {
    return {
      title: 'Level 4 · Complex Ethics & Strategy',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      description: 'Policy design, ethical dilemmas, and long-term implications.',
    };
  }
  return {
    title: `Level ${level} · Mastermind Challenge`,
    badgeClass: 'bg-accent/20 text-accent border-accent/40',
    description: 'Expert-level crisis scenarios and deep domain edge-cases.',
  };
}

const LOCAL_LADDER_BANKS = {
  sports: [
    'What is your favorite sport or athletic memory, and why does it stay with you?',
    'How has commercial sponsorship and big media money fundamentally changed professional sports?',
    'Should esports and competitive gaming be officially integrated into traditional events like the Olympic Games?',
    'How should sports governing bodies draw the ethical boundary between modern performance technology (e.g. carbon shoes, aerodynamic suits) and natural human athleticism?',
    'If you were appointed head of a major sports league facing a catastrophic match-fixing or doping scandal, what 90-day action plan would you execute to rebuild public trust?',
    'Will traditional broadcast television rights survive the shift to streaming algorithms, and how will sports franchises monetize fans in 2035?',
  ],
  tech: [
    'What is one piece of technology or software you use daily that you genuinely appreciate, and why?',
    'How will generative AI impact knowledge workers over the next 5 years — will it replace jobs or amplify human output?',
    'Should governments regulate AI models and foundation algorithms like public utilities, or will over-regulation stifle open-source innovation?',
    'How do we solve the AI copyright dilemma when foundation models are trained on millions of copyrighted human artworks and written publications?',
    'If an autonomous AI system causes a fatal real-world error, who bears legal and moral responsibility — the algorithm author, the deployment company, or the end user?',
    'How should humanity prepare for the geopolitical implications of artificial general intelligence (AGI) when sovereign nations compete for hardware dominance?',
  ],
  business: [
    'What is a product or service you recently paid for that offered incredible value, and what made the business model work?',
    'When a startup scales from 10 to 100 employees, what are the primary operational bottlenecks that break company culture?',
    'Is moving fast and breaking things still a viable startup philosophy, or has regulatory scrutiny killed aggressive blitzscaling?',
    'How should founders navigate the trade-off between venture capital growth demands and sustainable long-term profitability during economic downturns?',
    'Imagine your core product experiences a massive data outage during peak customer usage — how do you handle executive communication and board trust?',
    'Will decentralized autonomous organizations and borderless capital markets disintermediate traditional corporate governance in the next decade?',
  ],
  product: [
    'What is one app on your phone with exceptional UX, and what specific design interaction makes it so seamless?',
    'How do you prioritize your product roadmap when your enterprise sales team demands custom features but your core users want bug fixes?',
    'How should product managers measure meaningful long-term engagement versus deceptive dark patterns that boost short-term retention metrics?',
    'Describe how you would design a digital product specifically for elderly non-tech-savvy users without sacrificing modern speed and security.',
    'If your flagship product experiences a 20% drop in daily active users after a major redesign, walk through your step-by-step diagnostic and recovery plan.',
    'How do you build a sustainable moat for a software product in an era where AI can copy frontend interfaces and backend workflows overnight?',
  ],
  leadership: [
    'Describe a time you worked in a high-performing team — what made the collaboration effortless?',
    'How do you deliver difficult constructive feedback to a team member who is struggling to meet performance expectations?',
    'How should leaders maintain team morale and momentum during an organizational restructuring or major strategic pivot?',
    'How do you navigate a scenario where two senior executive stakeholders hold completely opposing views on a critical strategic investment?',
    'Walk through your framework for making high-consequence decisions when you only have 60% of the required data available under tight time constraints.',
    'How do you cultivate psychological safety in a remote, multi-cultural team while maintaining rigorous standards of accountability?',
  ],
  entertainment: [
    'What movie, book, or show has had the biggest impact on your perspective, and why?',
    'How has the rise of short-form video algorithms (TikTok, Reels) transformed human attention spans and storytelling formats?',
    'Are streaming subscription services reaching a saturation point, and will bundled ad-supported tiers save or kill content quality?',
    'How is generative synthetic media (AI actors, AI voice clone songs) changing the intellectual property rights of artists and performers?',
    'Should social media platforms be legally treated as neutral public conduits or curated publishers responsible for algorithmic radicalization?',
    'What will the future of interactive entertainment look like when real-time AI engines generate customized narrative worlds on demand?',
  ],
};

export function getLocalFallbackQuestion(domain, level) {
  const domainKey = (domain || '').toLowerCase().trim();
  let bank = LOCAL_LADDER_BANKS[domainKey];

  if (!bank) {
    // Check key match
    const matchedKey = Object.keys(LOCAL_LADDER_BANKS).find((k) => domainKey.includes(k));
    bank = matchedKey ? LOCAL_LADDER_BANKS[matchedKey] : null;
  }

  if (bank && bank[level - 1]) {
    return bank[level - 1];
  }

  // Generic fallback escalation prompts if level > bank length or custom domain
  const genericPrompts = [
    `Level ${level} (Warm-Up): What is your personal connection to ${domain}, and why is it important to you?`,
    `Level ${level} (Deep Analysis): What are the core trends or debates shaping the future of ${domain} today?`,
    `Level ${level} (High-Stakes Debate): What is the most controversial or misunderstood aspect of ${domain}?`,
    `Level ${level} (Complex Ethics): What ethical or structural dilemmas will ${domain} face over the next 10 years?`,
    `Level ${level} (Mastermind Challenge): If you were tasked with restructuring ${domain} from the ground up, what radical changes would you implement?`,
  ];

  const index = Math.min(level - 1, genericPrompts.length - 1);
  return genericPrompts[index];
}
