import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/firebase';

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    trackPageView(fullPath);
  }, [location.pathname, location.search]);

  return null;
}
