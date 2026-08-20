import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { saveSessionToFirestore, loadUserSessionsFromFirestore, trackAnalyticsEvent } from '../lib/firebase';

const STORAGE_KEY = 'speakwell_sessions';

function loadLocalSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

const useSessionStore = create((set, get) => ({
  // User Auth State
  user: null,
  setUser: async (userObj) => {
    set({ user: userObj });
    if (userObj?.uid) {
      const cloudSessions = await loadUserSessionsFromFirestore(userObj.uid);
      if (cloudSessions && cloudSessions.length > 0) {
        const local = loadLocalSessions();
        const mergedMap = new Map();
        [...cloudSessions, ...local].forEach((s) => mergedMap.set(s.id, s));
        const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        saveLocalSessions(merged);
        set({ sessions: merged });
      }
    }
  },

  sessions: loadLocalSessions(),
  sessionType: 'free',

  selectedContext: '',
  customContext: '',
  isRecording: false,
  currentTranscript: '',
  currentElapsed: 0,
  isProcessing: false,
  processingStep: 0,

  drillQuestions: [],
  drillTimerSecs: 60,
  currentDrillIndex: 0,
  drillAnswers: [],

  ladderDomain: '',
  ladderLevel: 1,
  ladderAnswers: [],

  slideDeck: [],
  slideTimerSecs: 60,
  currentSlideIndex: 0,
  slideAnswers: [],

  frameworkType: 'prep',
  frameworkPrompt: '',
  currentFrameworkStep: 0,
  frameworkAnswers: [],

  scriptText: '',
  scriptTitle: '',
  scriptPaceWpm: 140,

  currentSession: null,

  compareA: null,
  compareB: null,
  compareInsight: '',
  compareLoading: false,

  // Actions
  setSessionType: (type) => {
    trackAnalyticsEvent('mode_selected', { mode_name: type });
    set({ sessionType: type });
  },
  setContext: (ctx) => set({ selectedContext: ctx }),
  setCustomContext: (text) => set({ customContext: text }),
  setRecording: (val) => set({ isRecording: val }),
  setTranscript: (text) => set({ currentTranscript: text }),
  setElapsed: (secs) => set({ currentElapsed: secs }),
  setProcessing: (val) => set({ isProcessing: val }),
  setProcessingStep: (step) => set({ processingStep: step }),

  // Drill actions
  setDrillSetup: ({ questions, timerSecs }) => {
    trackAnalyticsEvent('mode_selected', { mode_name: 'drill' });
    set({
      sessionType: 'drill',
      drillQuestions: questions,
      drillTimerSecs: timerSecs ?? 60,
      currentDrillIndex: 0,
      drillAnswers: [],
    });
  },

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
  setLadderDomain: (domain) => {
    trackAnalyticsEvent('mode_selected', { mode_name: 'ladder', domain });
    set({
      sessionType: 'ladder',
      ladderDomain: domain,
      ladderLevel: 1,
      ladderAnswers: [],
    });
  },

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
  setSlideSetup: ({ slides, timerSecs }) => {
    trackAnalyticsEvent('mode_selected', { mode_name: 'slide' });
    set({
      sessionType: 'slide',
      slideDeck: slides,
      slideTimerSecs: timerSecs ?? 60,
      currentSlideIndex: 0,
      slideAnswers: [],
    });
  },

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
  setFrameworkSetup: ({ frameworkType, prompt }) => {
    trackAnalyticsEvent('mode_selected', { mode_name: 'framework', framework_type: frameworkType });
    set({
      sessionType: 'framework',
      frameworkType: frameworkType || 'prep',
      frameworkPrompt: prompt || '',
      currentFrameworkStep: 0,
      frameworkAnswers: [],
    });
  },

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
  setScriptSetup: ({ text, title, paceWpm }) => {
    trackAnalyticsEvent('mode_selected', { mode_name: 'script' });
    set({
      sessionType: 'script',
      scriptText: text || '',
      scriptTitle: title || 'Script Rehearsal',
      scriptPaceWpm: paceWpm || 140,
    });
  },

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
    saveLocalSessions(updated);
    set({ sessions: updated, currentSession: session });

    trackAnalyticsEvent('speech_session_completed', {
      session_type: sessionData.sessionType || 'free',
      duration_sec: sessionData.durationSecs || 0,
      overall_score: sessionData.metrics?.overall || 0,
      fillers_count: sessionData.metrics?.fillers || 0,
      grammar_count: sessionData.metrics?.grammar || 0,
    });

    const currentUser = get().user;
    if (currentUser?.uid) {
      saveSessionToFirestore(currentUser.uid, session);
    }

    return session;
  },

  setCompareA: (session) => set({ compareA: session }),
  setCompareB: (session) => set({ compareB: session }),
  setCompareInsight: (text) => set({ compareInsight: text }),
  setCompareLoading: (val) => set({ compareLoading: val }),

  getSessionById: (id) => get().sessions.find((s) => s.id === id),

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
