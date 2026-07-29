import { NavLink, useLocation } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';

export default function Topbar() {
  const location = useLocation();
  const selectedContext = useSessionStore((s) => s.selectedContext);
  const sessionType = useSessionStore((s) => s.sessionType);

  const showBadge = ['/record', '/drill-record', '/processing', '/results'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <nav className="fixed top-0 left-0 right-0 h-[60px] border-b border-b-border/50 bg-[rgba(14,14,13,0.92)] backdrop-blur-[16px] z-50 flex items-center justify-between px-6 max-[640px]:px-4">
      {/* Brand Logo */}
      <NavLink
        to="/"
        className="font-serif italic text-[22px] text-accent tracking-[-0.01em] cursor-pointer no-underline flex items-center gap-1.5"
      >
        speakwell<span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
      </NavLink>

      {/* Navigation Links (Desktop & Tablet) */}
      <div className="flex items-center gap-1 max-[640px]:gap-0.5">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-[13px] px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light ${
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
            `text-[13px] px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light ${
              isActive || (location.pathname === '/record' && sessionType !== 'drill')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Free Talk
        </NavLink>

        <NavLink
          to="/drill-setup"
          className={({ isActive }) =>
            `text-[13px] px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light flex items-center gap-1 ${
              isActive || location.pathname === '/drill-record' || (location.pathname === '/record' && sessionType === 'drill')
                ? 'text-accent bg-accent-dim font-medium'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Question Drills 🎯
        </NavLink>

        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `text-[13px] px-3 py-[6px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light max-[640px]:hidden ${
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
      <div className="flex items-center gap-2">
        {showBadge && (
          <div className="text-[11px] bg-accent-dim border border-accent-border text-accent px-3 py-1 rounded-full tracking-[0.02em] font-medium max-w-[140px] truncate">
            {selectedContext || (sessionType === 'drill' ? 'Question Drill' : 'Free Talk')}
          </div>
        )}
      </div>
    </nav>
  );
}
