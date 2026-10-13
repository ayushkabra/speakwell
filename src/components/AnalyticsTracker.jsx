import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/firebase';

const ROUTE_TITLES = {
  '/': 'Speakwell — Free AI Speech Coach',
  '/context': 'Speakwell — Topic & Context Setup',
  '/record': 'Speakwell — Free Talk Recording',
  '/drill-setup': 'Speakwell — Question Drills Setup',
  '/drill-record': 'Speakwell — Question Drills Practice',
  '/ladder-setup': 'Speakwell — Topic Ladder Setup',
  '/ladder-record': 'Speakwell — Topic Ladder Practice',
  '/slide-setup': 'Speakwell — Slide Deck Setup',
  '/slide-record': 'Speakwell — Slide Deck Practice',
  '/framework-setup': 'Speakwell — Framework Setup',
  '/framework-record': 'Speakwell — Framework Practice',
  '/script-setup': 'Speakwell — Script Rehearsal Setup',
  '/script-record': 'Speakwell — Teleprompter Rehearsal',
  '/processing': 'Speakwell — Analyzing Speech...',
  '/results': 'Speakwell — Speech Analysis & Results',
  '/compare': 'Speakwell — Session Comparison',
};

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname] || 'Speakwell — AI Speech Coach';
    document.title = title;
    trackPageView(location.pathname + location.search, title);
  }, [location.pathname, location.search]);

  return null;
}
