import { NavLink, useLocation } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';

export default function Topbar() {
  const location = useLocation();
  const selectedContext = useSessionStore((s) => s.selectedContext);
  const sessionType = useSessionStore((s) => s.sessionType);

  const showBadge = ['/record', '/drill-record', '/ladder-record', '/slide-record', '/framework-record', '/processing', '/results'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <nav className="fixed top-0 left-0 right-0 h-[60px] border-b border-b-border/50 bg-[rgba(14,14,13,0.95)] backdrop-blur-[16px] z-50 flex items-center justify-between px-6 max-[768px]:px-3 max-[768px]:gap-2">
      {/* Brand Logo */}
      <NavLink
        to="/"
        className="font-serif italic text-[20px] sm:text-[22px] text-accent tracking-[-0.01em] cursor-pointer no-underline flex items-center gap-1 shrink-0"
      >
        speakwell<span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
      </NavLink>

      {/* Navigation Links (Scrollable & Responsive on Mobile) */}
      <div className="flex items-center gap-1 max-[768px]:gap-0.5 overflow-x-auto no-scrollbar py-1 px-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 ${
              isActive
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/context"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 ${
              isActive || (location.pathname === '/record' && sessionType === 'free')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Free Talk
        </NavLink>

        <NavLink
          to="/framework-setup"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 flex items-center gap-1 ${
              isActive || location.pathname === '/framework-record' || (location.pathname === '/record' && sessionType === 'framework')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Frameworks 🧠
        </NavLink>

        <NavLink
          to="/drill-setup"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 flex items-center gap-1 ${
              isActive || location.pathname === '/drill-record' || (location.pathname === '/record' && sessionType === 'drill')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          <span className="hidden sm:inline">Question </span>Drills 🎯
        </NavLink>

        <NavLink
          to="/ladder-setup"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 flex items-center gap-1 ${
              isActive || location.pathname === '/ladder-record' || (location.pathname === '/record' && sessionType === 'ladder')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          <span className="hidden sm:inline">Topic </span>Ladders 🪜
        </NavLink>

        <NavLink
          to="/slide-setup"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 flex items-center gap-1 ${
              isActive || location.pathname === '/slide-record' || (location.pathname === '/record' && sessionType === 'slide')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          <span className="hidden sm:inline">Slide </span>Decks 🖼️
        </NavLink>

        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `text-[12px] sm:text-[13px] px-2.5 sm:px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light shrink-0 ${
              isActive
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Compare
        </NavLink>
      </div>

      {/* Active Session Context Badge */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {showBadge && (
          <div className="text-[11px] bg-accent-dim border border-accent-border text-accent px-3 py-1 rounded-full tracking-[0.02em] font-medium max-w-[140px] truncate">
            {selectedContext || (sessionType === 'framework' ? 'Framework' : sessionType === 'slide' ? 'Slide Deck' : sessionType === 'ladder' ? 'Topic Ladder' : sessionType === 'drill' ? 'Question Drill' : 'Free Talk')}
          </div>
        )}
      </div>
    </nav>
  );
}
