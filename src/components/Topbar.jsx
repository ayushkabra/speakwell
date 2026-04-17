import { NavLink, useLocation } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';

export default function Topbar() {
  const location = useLocation();
  const selectedContext = useSessionStore((s) => s.selectedContext);

  const showBadge = ['/record', '/processing', '/results'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <nav className="fixed top-0 left-0 right-0 h-[60px] border-b border-b-border/50 bg-[rgba(14,14,13,0.88)] backdrop-blur-[16px] z-100 flex items-center justify-between px-10">
      <NavLink
        to="/"
        className="font-serif italic text-[20px] text-accent tracking-[-0.01em] cursor-pointer no-underline"
      >
        speakwell.
      </NavLink>

      <div className="hidden min-[800px]:flex items-center gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-[13px] px-3.5 py-[7px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light ${
              isActive
                ? 'text-accent bg-accent-dim'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/context"
          className={({ isActive }) =>
            `text-[13px] px-3.5 py-[7px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light ${
              isActive || location.pathname === '/record' || location.pathname === '/processing'
                ? 'text-accent bg-accent-dim'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          New Session
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `text-[13px] px-3.5 py-[7px] rounded-lg cursor-pointer transition-all duration-[180ms] no-underline font-sans font-light ${
              isActive
                ? 'text-accent bg-accent-dim'
                : 'text-text2 hover:text-text hover:bg-surface2'
            }`
          }
        >
          Compare
        </NavLink>
      </div>

      <div className="flex items-center gap-2.5">
        {showBadge && (
          <div className="text-[11px] bg-accent-dim border border-accent-border text-accent px-3 py-1 rounded-full tracking-[0.02em]">
            {selectedContext || 'Free Talk'}
          </div>
        )}
      </div>
    </nav>
  );
}
