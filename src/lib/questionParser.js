/**
 * Utility for parsing questions across all extreme edge cases
 * and providing a rich Random Topic Bank (Easy, Medium, Hard) for Free Talk Mode.
 */

export const PRESET_PACKS = [
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    icon: '💼',
    description: 'Classic STAR-method interview questions',
    questions: [
      'Tell me about a time you faced a difficult conflict at work and how you resolved it.',
      'Describe a project you are most proud of. What was your specific contribution?',
      'Tell me about a time you failed or made a mistake. What did you learn?',
      'How do you prioritize tasks when faced with competing deadlines?',
    ],
  },
  {
    id: 'pitch',
    title: 'Startup & Product Pitch',
    icon: '🚀',
    description: 'Elevator pitches, value prop & objection handling',
    questions: [
      'Give me your 60-second elevator pitch for your product or idea.',
      'What core problem does your solution solve, and why now?',
      'Who is your ideal customer profile and how do you reach them?',
      'Why are you and your team uniquely positioned to win in this market?',
    ],
  },
  {
    id: 'self-intro',
    title: 'Self Introduction & Story',
    icon: '👤',
    description: 'Personal background, career journey & aspirations',
    questions: [
      'Walk me through your resume and career journey in 2 minutes.',
      'What are your top 3 professional strengths and 1 area you are actively improving?',
      'Where do you see yourself professionally in the next 3 to 5 years?',
    ],
  },
  {
    id: 'technical',
    title: 'System & Problem Solving',
    icon: '🧩',
    description: 'Architectural, design & problem-solving walkthroughs',
    questions: [
      'How would you explain a complex technical concept to a non-technical stakeholder?',
      'Walk me through how you approach debugging an outage or unexpected production issue.',
      'Describe a trade-off decision you had to make between speed and code quality.',
    ],
  },
];

/**
 * Rich Random Topic Generator Bank for Free Talk Mode
 */
export const TOPIC_BANK = {
  easy: [
    { text: 'Talk about your favorite movie or book and why you recommend it.', category: 'Personal' },
    { text: 'If you could travel anywhere in the world tomorrow, where would you go and why?', category: 'Personal' },
    { text: 'What does your ideal weekend look like from start to finish?', category: 'Lifestyle' },
    { text: 'Describe a new hobby or skill you recently started or want to learn.', category: 'Learning' },
    { text: 'What is one dish or cuisine you could eat every day for the rest of your life?', category: 'Fun' },
    { text: 'Tell me about your favorite childhood memory or mentor.', category: 'Personal' },
    { text: 'What is your morning routine and how does it set up your day?', category: 'Lifestyle' },
  ],
  medium: [
    { text: 'Should AI replace human teachers in high schools? Pitch your perspective.', category: 'Debate' },
    { text: 'Compare Remote Work vs In-Office Work. How should a modern company balance both?', category: 'Work' },
    { text: 'If given $50,000 to launch a micro-business, what would you build and why?', category: 'Business' },
    { text: 'What is one opinion you hold strongly that most people around you disagree with?', category: 'Mindset' },
    { text: 'How do you stay focused and productive when feeling completely unmotivated?', category: 'Productivity' },
    { text: 'Explain how social media impacts mental health in young adults.', category: 'Society' },
    { text: 'How do you handle negative feedback or criticism from a supervisor?', category: 'Work' },
  ],
  hard: [
    { text: 'Debate both sides: Is digital privacy completely dead in the age of Big Data and AI?', category: 'Tech & Ethics' },
    { text: 'Propose an innovative solution for urban traffic congestion without adding new road lanes.', category: 'Urban Design' },
    { text: 'Walk me through how you would pitch a zero-to-one product to skeptical VC investors.', category: 'Startup Pitch' },
    { text: 'How should global governments regulate Autonomous AI Agents to prevent systemic risk?', category: 'AI Policy' },
    { text: 'Analyze why 90% of tech startups fail in their first 18 months and how to avoid it.', category: 'Business Strategy' },
    { text: 'Explain Quantum Computing or Blockchains to a 10-year-old using simple analogies.', category: 'Technical Explain' },
  ],
};

/**
 * Returns a random topic based on selected difficulty ('easy' | 'medium' | 'hard' | 'all')
 */
export function getRandomTopic(difficulty = 'all') {
  let pool = [];
  if (difficulty === 'all') {
    pool = [...TOPIC_BANK.easy, ...TOPIC_BANK.medium, ...TOPIC_BANK.hard];
  } else if (TOPIC_BANK[difficulty]) {
    pool = TOPIC_BANK[difficulty];
  } else {
    pool = [...TOPIC_BANK.easy, ...TOPIC_BANK.medium, ...TOPIC_BANK.hard];
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Extreme Edge Case Cleaner: Strip all possible question prefixes & markers
 */
export function cleanQuestionPrefix(line) {
  if (!line) return '';

  return line
    .trim()
    // Strip explicit prefixes like Q1:, Q-1, Q.1, Q 1, Question 1:, Prompt 1:, Task 1:, Problem 1:, Scenario 1:
    .replace(/^(?:Q\s*[\d\.-]+:?|Question\s*[\d\.-]+:?|Prompt\s*\d+:?|Task\s*\d+:?|Problem\s*\d+:?|Scenario\s*\d+:?|Case\s*\d+:?)\s*/i, '')
    // Strip numbers & letters like 1., 1), (1), 1 -, I., II., A., a)
    .replace(/^(?:\(\d+\)|\d+[\.\)\-]|[A-Za-z][\.\)]|[IVXLCDM]+[\.\)])\s*/i, '')
    // Strip bullet icons & dashes like •, -, *, >, —, ▪, ▫
    .replace(/^(?:[•\-*>\u2014\u25AA\u25AB])\s*/, '')
    .trim();
}

/**
 * Comprehensive Question Detector across all extreme edge cases
 */
export function isLikelyQuestion(text) {
  if (!text || text.trim().length < 4) return false;
  const clean = cleanQuestionPrefix(text);

  // Exclude obvious flowchart arrows, log traces, or system markers
  if (clean.includes('→') || /^User speaks|Your answer:|SECTION \d+:|Page \d+/i.test(clean)) {
    return false;
  }

  // 1. Explicit question mark at the end
  if (clean.endsWith('?')) return true;

  // 2. Contains a question mark anywhere in the sentence
  if (clean.includes('?')) return true;

  // 3. Starts with explicit Question/Prompt identifiers
  if (/^(?:Q\d+:?|Question\s*\d+:?|Prompt\s*\d+:?|Task\s*\d+:?|Problem\s*\d+:?)/i.test(text.trim())) {
    return true;
  }

  // 4. Starts with English or Hinglish interrogative / prompt words
  const questionStartRegex = /^(?:what|how|why|when|where|who|which|can|could|would|should|tell|describe|explain|walk|give|do|does|is|are|have|has|discuss|design|compare|analyze|propose|evaluate|formulate|detail|outline|list|define|identify|suppose|imagine|if|kya|kaise|kyun|kab|kaha|batao|samjhao)\b/i;

  return questionStartRegex.test(clean);
}

/**
 * Parses raw text input into array of clean question strings across all edge cases
 */
export function parseQuestionsFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // Pattern 1: Look for explicit Q1:, Q2:, Q3: or Question 1: blocks
  const qNumMatches = text.match(/(?:Q\d+:?|Question\s*\d+:?)\s*[^?\n]+(?:\?|\n|$)/gi);
  if (qNumMatches && qNumMatches.length >= 2) {
    return qNumMatches
      .map((q) => cleanQuestionPrefix(q))
      .filter((q) => q.length > 5);
  }

  // Pattern 2: Split by line breaks
  const rawLines = text.split(/\n+|\r+/);
  const questions = [];

  for (let line of rawLines) {
    const cleaned = cleanQuestionPrefix(line);

    if (isLikelyQuestion(line) || isLikelyQuestion(cleaned)) {
      if (cleaned.length > 4) {
        questions.push(cleaned);
      }
    }
  }

  // Pattern 3: Split by question marks if line split returned fewer questions
  if (questions.length < 2 && text.includes('?')) {
    const qSplits = text
      .split(/(?<=\?)/)
      .map((s) => cleanQuestionPrefix(s))
      .filter((s) => s.length > 6 && isLikelyQuestion(s));

    if (qSplits.length > 0) {
      return qSplits;
    }
  }

  return questions;
}

/**
 * Smart PDF/File Question Extractor using PDF.js & Claude API Backend
 */
export async function parseQuestionsFromFile(file) {
  if (!file) return [];

  const fileName = file.name.toLowerCase();

  // 1. Text & Markdown files
  if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
    const text = await file.text();
    return parseQuestionsFromText(text);
  }

  // 2. PDF Files using PDF.js
  if (fileName.endsWith('.pdf')) {
    let extractedText = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (window.pdfjsLib) {
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageItems = textContent.items.map((item) => item.str);
          extractedText += pageItems.join(' ') + '\n';
        }
      }
    } catch (err) {
      console.warn('PDF.js client extraction error:', err);
    }

    if (extractedText.trim()) {
      try {
        const response = await fetch('http://localhost:3001/api/extract-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentText: extractedText }),
        });
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          return data.questions.map((q) => cleanQuestionPrefix(q));
        }
      } catch (err) {
        console.warn('Claude API question extraction offline or unreachable, using local parser:', err);
      }

      return parseQuestionsFromText(extractedText);
    }
  }

  const text = await file.text();
  return parseQuestionsFromText(text);
}
