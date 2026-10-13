import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCFSaBwk4J6S5a0oq5mesjUiYsKd5MhGi0",
  authDomain: "speakwell-555c4.firebaseapp.com",
  projectId: "speakwell-555c4",
  storageBucket: "speakwell-555c4.firebasestorage.app",
  messagingSenderId: "804163134495",
  appId: "1:804163134495:web:55770e2a8d8ef96d81e12a",
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ? { measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID } : {})
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

let analyticsInstance = null;
const analyticsPromise = (typeof window !== 'undefined')
  ? isSupported().then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
        return analyticsInstance;
      }
      return null;
    }).catch(() => null)
  : Promise.resolve(null);

export async function trackAnalyticsEvent(eventName, eventParams = {}) {
  try {
    const inst = analyticsInstance || await analyticsPromise;
    if (inst) {
      logEvent(inst, eventName, eventParams);
    }
  } catch (err) {
    console.warn('Analytics event warning:', err);
  }
}

export async function trackPageView(pagePath, pageTitle) {
  try {
    const inst = analyticsInstance || await analyticsPromise;
    if (inst) {
      logEvent(inst, 'page_view', {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: pageTitle || document.title,
      });
    }
  } catch (err) {
    console.warn('Analytics page_view warning:', err);
  }
}

export async function setUserAnalyticsContext(user) {
  try {
    const inst = analyticsInstance || await analyticsPromise;
    if (inst) {
      if (user?.uid) {
        setUserId(inst, user.uid);
        setUserProperties(inst, { user_type: 'registered' });
      } else {
        setUserId(inst, null);
        setUserProperties(inst, { user_type: 'guest' });
      }
    }
  } catch (err) {
    console.warn('User analytics context warning:', err);
  }
}

export async function loginWithGoogle(source = 'topbar') {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    trackAnalyticsEvent('login', { method: 'google', source });
    return result.user;
  } catch (err) {
    console.warn('Popup sign in failed or blocked, trying redirect:', err);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (redirectErr) {
      console.error('Google Redirect Sign-in error:', redirectErr);
      throw redirectErr;
    }
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    trackAnalyticsEvent('logout');
  } catch (err) {
    console.error('Sign-out error:', err);
  }
}

export async function saveSessionToFirestore(userId, sessionData) {
  if (!userId || !sessionData?.id) return;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionData.id);
    await setDoc(sessionRef, sessionData, { merge: true });
  } catch (err) {
    console.warn('Firestore save session error:', err);
  }
}

export async function loadUserSessionsFromFirestore(userId) {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'users', userId, 'sessions'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push(doc.data());
    });
    return sessions;
  } catch (err) {
    console.warn('Firestore load sessions error:', err);
    return [];
  }
}

export { onAuthStateChanged };
