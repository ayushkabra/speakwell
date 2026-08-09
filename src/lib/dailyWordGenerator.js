export const DAILY_WORDS = [
  {
    word: 'Equanimity',
    phonetic: '/ˌe-kwə-ˈni-mə-tē/',
    partOfSpeech: 'noun',
    definition: 'Mental calmness, composure, and evenness of temper, especially in a difficult or high-pressure situation.',
    prompt: 'Reflect on a situation where maintaining your composure altered the outcome for the better.',
  },
  {
    word: 'Resilience',
    phonetic: '/ri-ˈzil-yən(t)s/',
    partOfSpeech: 'noun',
    definition: 'The capacity to withstand or recover quickly from difficulties; toughness and adaptability.',
    prompt: 'Share a moment where an unexpected setback forced you to pivot and come back stronger.',
  },
  {
    word: 'Gravitas',
    phonetic: '/ˈgra-və-ˌtäs/',
    partOfSpeech: 'noun',
    definition: 'Dignity, seriousness, or solemnity of manner that commands respect in communication.',
    prompt: 'What does speaking with authority and presence mean to you when delivering important news?',
  },
  {
    word: 'Conviction',
    phonetic: '/kən-ˈvik-shən/',
    partOfSpeech: 'noun',
    definition: 'A firmly held belief or opinion expressed with certainty and authenticity.',
    prompt: 'Talk about an idea or value you hold deeply, even if others disagree with it.',
  },
  {
    word: 'Velocity',
    phonetic: '/və-ˈlä-sə-tē/',
    partOfSpeech: 'noun',
    definition: 'Speed in a given direction; combining rapid execution with clear intentional focus.',
    prompt: 'How do you balance moving fast with maintaining high quality in your work or speech?',
  },
  {
    word: 'Perspective',
    phonetic: '/pər-ˈspek-tiv/',
    partOfSpeech: 'noun',
    definition: 'A particular attitude toward or way of regarding something; a point of view.',
    prompt: 'Describe a time when hearing someone else’s viewpoint completely changed your mind.',
  },
  {
    word: 'Authenticity',
    phonetic: '/ˌȯ-thən-ˈti-sə-tē/',
    partOfSpeech: 'noun',
    definition: 'The quality of being genuine, real, and true to one’s own personality or values.',
    prompt: 'Why is staying true to your authentic voice more effective than trying to sound like someone else?',
  },
  {
    word: 'Pragmatism',
    phonetic: '/ˈprag-mə-ˌti-zəm/',
    partOfSpeech: 'noun',
    definition: 'An approach that assesses the truth of meaning of theories or beliefs in terms of the success of their practical application.',
    prompt: 'Discuss a situation where choosing a practical solution was better than waiting for a perfect one.',
  },
];

/**
 * Returns today's word deterministically based on calendar date
 */
export function getTodayWord() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = dayOfYear % DAILY_WORDS.length;
  return DAILY_WORDS[index];
}
