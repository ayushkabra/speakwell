import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'speakwell_sessions';

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

const useSessionStore = create((set, get) => ({
  // All saved sessions
  sessions: loadSessions(),

  // Current session type: 'free' | 'drill' | 'ladder' | 'slide' | 'framework' | 'script'
  sessionType: 'free',

  // Free talk state
  selectedContext: '',
  customContext: '',
  isRecording: false,
  currentTranscript: '',
  currentElapsed: 0,
  isProcessing: false,
  processingStep: 0,

  // Drill mode state
  drillQuestions: [],
  drillTimerSecs: 60,
  currentDrillIndex: 0,
  drillAnswers: [],

  // Topic Ladder state
  ladderDomain: '',
  ladderLevel: 1,
  ladderAnswers: [],

  // Slide Deck state
  slideDeck: [],
  slideTimerSecs: 60,
  currentSlideIndex: 0,
  slideAnswers: [],

  // Framework mode state
  frameworkType: 'prep',
  frameworkPrompt: '',
  currentFrameworkStep: 0,
  frameworkAnswers: [],

  // Script Rehearsal state
  scriptText: '',
  scriptTitle: '',
  scriptPaceWpm: 140,

  // Current results (after recording)
  currentSession: null,

  // Compare state
  compareA: null,
  compareB: null,
  compareInsight: '',
  compareLoading: false,

  // Actions
  setSessionType: (type) => set({ sessionType: type }),
  setContext: (ctx) => set({ selectedContext: ctx }),
  setCustomContext: (text) => set({ customContext: text }),
  setRecording: (val) => set({ isRecording: val }),
  setTranscript: (text) => set({ currentTranscript: text }),
  setElapsed: (secs) => set({ currentElapsed: secs }),
  setProcessing: (val) => set({ isProcessing: val }),
  setProcessingStep: (step) => set({ processingStep: step }),

  // Drill actions
  setDrillSetup: ({ questions, timerSecs }) =>
    set({
      sessionType: 'drill',
      drillQuestions: questions,
      drillTimerSecs: timerSecs ?? 60,
      currentDrillIndex: 0,
      drillAnswers: [],
    }),

  addDrillAnswer: (answer) =>
    set((state) => {
      const filtered = state.drillAnswers.filter((a) => a.questionIndex !== answer.questionIndex);
      const updated = [...filtered, answer].sort((a, b) => a.questionIndex - b.questionIndex);
      return { drillAnswers: updated };
    }),

  setCurrentDrillIndex: (idx) => set({ currentDrillIndex: idx }),

  resetDrill: () =>
    set({
      drillQuestions: [],
      currentDrillIndex: 0,
      drillAnswers: [],
    }),

  // Ladder Actions
  setLadderDomain: (domain) =>
    set({
      sessionType: 'ladder',
      ladderDomain: domain,
      ladderLevel: 1,
      ladderAnswers: [],
    }),

  addLadderAnswer: (answer) =>
    set((state) => {
      const filtered = state.ladderAnswers.filter((a) => a.level !== answer.level);
      const updated = [...filtered, answer].sort((a, b) => a.level - b.level);
      return { ladderAnswers: updated };
    }),

  setLadderLevel: (lvl) => set({ ladderLevel: lvl }),

  resetLadder: () =>
    set({
      ladderDomain: '',
      ladderLevel: 1,
      ladderAnswers: [],
    }),

  // Slide Deck Actions
  setSlideSetup: ({ slides, timerSecs }) =>
    set({
      sessionType: 'slide',
      slideDeck: slides,
      slideTimerSecs: timerSecs ?? 60,
      currentSlideIndex: 0,
      slideAnswers: [],
    }),

  addSlideAnswer: (answer) =>
    set((state) => {
      const filtered = state.slideAnswers.filter((a) => a.slideIndex !== answer.slideIndex);
      const updated = [...filtered, answer].sort((a, b) => a.slideIndex - b.slideIndex);
      return { slideAnswers: updated };
    }),

  setCurrentSlideIndex: (idx) => set({ currentSlideIndex: idx }),

  resetSlideDeck: () =>
    set({
      slideDeck: [],
      currentSlideIndex: 0,
      slideAnswers: [],
    }),

  // Framework Actions
  setFrameworkSetup: ({ frameworkType, prompt }) =>
    set({
      sessionType: 'framework',
      frameworkType: frameworkType || 'prep',
      frameworkPrompt: prompt || '',
      currentFrameworkStep: 0,
      frameworkAnswers: [],
    }),

  addFrameworkAnswer: (answer) =>
    set((state) => {
      const filtered = state.frameworkAnswers.filter((a) => a.stepIndex !== answer.stepIndex);
      const updated = [...filtered, answer].sort((a, b) => a.stepIndex - b.stepIndex);
      return { frameworkAnswers: updated };
    }),

  setCurrentFrameworkStep: (idx) => set({ currentFrameworkStep: idx }),

  resetFramework: () =>
    set({
      frameworkType: 'prep',
      frameworkPrompt: '',
      currentFrameworkStep: 0,
      frameworkAnswers: [],
    }),

  // Script Actions
  setScriptSetup: ({ text, title, paceWpm }) =>
    set({
      sessionType: 'script',
      scriptText: text || '',
      scriptTitle: title || 'Script Rehearsal',
      scriptPaceWpm: paceWpm || 140,
    }),

  resetScript: () =>
    set({
      scriptText: '',
      scriptTitle: '',
      scriptPaceWpm: 140,
    }),

  setCurrentSession: (session) => set({ currentSession: session }),

  addSession: (sessionData) => {
    const session = {
      id: uuidv4(),
      date: new Date().toISOString(),
      ...sessionData,
    };
    const updated = [session, ...get().sessions];
    saveSessions(updated);
    set({ sessions: updated, currentSession: session });
    return session;
  },

  setCompareA: (session) => set({ compareA: session }),
  setCompareB: (session) => set({ compareB: session }),
  setCompareInsight: (text) => set({ compareInsight: text }),
  setCompareLoading: (val) => set({ compareLoading: val }),

  getSessionById: (id) => get().sessions.find((s) => s.id === id),

  // Computed: stats for home screen
  getStats: () => {
    const sessions = get().sessions;
    const count = sessions.length;
    const best = sessions.reduce((max, s) => Math.max(max, s.metrics?.overall || 0), 0);
    let gained = 0;
    if (sessions.length >= 2) {
      const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
      gained = (sorted[sorted.length - 1].metrics?.overall || 0) - (sorted[0].metrics?.overall || 0);
    }
    return { count, best, gained };
  },
}));

export default useSessionStore;
