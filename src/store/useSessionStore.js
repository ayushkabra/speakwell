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

  // Current recording state
  selectedContext: '',
  customContext: '',
  isRecording: false,
  currentTranscript: '',
  currentElapsed: 0,
  isProcessing: false,
  processingStep: 0,

  // Current results (after recording)
  currentSession: null,

  // Compare state
  compareA: null,
  compareB: null,
  compareInsight: '',
  compareLoading: false,

  // Actions
  setContext: (ctx) => set({ selectedContext: ctx }),
  setCustomContext: (text) => set({ customContext: text }),
  setRecording: (val) => set({ isRecording: val }),
  setTranscript: (text) => set({ currentTranscript: text }),
  setElapsed: (secs) => set({ currentElapsed: secs }),
  setProcessing: (val) => set({ isProcessing: val }),
  setProcessingStep: (step) => set({ processingStep: step }),

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
