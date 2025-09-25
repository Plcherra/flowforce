import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationEvent {
  route: string;
  timestamp: number;
  referrer: string;
  userAgent: string;
  sessionId: string;
}

// Simple session ID generation
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('navigation_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('navigation_session_id', sessionId);
  }
  return sessionId;
};

export function useNavigationAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const navigationEvent: NavigationEvent = {
      route: location.pathname,
      timestamp: Date.now(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
    };

    // Log navigation for debugging (in production, this would send to analytics service)
    console.log('Navigation Event:', navigationEvent);

    // Store recent navigation history in sessionStorage for debugging
    const recentNavigation = JSON.parse(sessionStorage.getItem('recent_navigation') || '[]');
    recentNavigation.push(navigationEvent);
    
    // Keep only last 10 navigation events
    if (recentNavigation.length > 10) {
      recentNavigation.shift();
    }
    
    sessionStorage.setItem('recent_navigation', JSON.stringify(recentNavigation));

    // Track page title changes for SEO
    if (document.title) {
      console.log(`Page title: ${document.title} for route: ${location.pathname}`);
    }
  }, [location]);
}
