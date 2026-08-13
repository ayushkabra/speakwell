import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import { loginWithGoogle, logoutUser, onAuthStateChanged, auth } from '../lib/firebase';

export default function Topbar() {
  const location = useLocation();
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  const handleAuthAction = async () => {
    if (user) {
      await logoutUser();
    } else {
      try {
        await loginWithGoogle();
      } catch (err) {
        console.warn('Google sign in error:', err);
      }
    }
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-3 pointer-events-none">
      <nav className="pointer-events-auto bg-[#161c1a]/90 backdrop-blur-md border border-[#f4e8d61f] rounded-full px-4 py-2 flex items-center justify-between gap-2 shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-w-[1040px] w-full">
        {/* Left: Brand Logo */}
        <NavLink
          to="/"
          className="font-serif italic text-[19px] sm:text-[21px] text-[#f4e8d6] tracking-[-0.02em] cursor-pointer no-underline flex items-center gap-1 shrink-0 pl-1 pr-1 font-medium"
        >
          speakwell<span className="w-1.5 h-1.5 rounded-full bg-[#c47a4a] inline-block" />
        </NavLink>

        {/* Center: Scrollable Links */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[760px]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/context"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Free Talk 🎙️
          </NavLink>

          <NavLink
            to="/script-setup"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/script-record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Script 📜
          </NavLink>

          <NavLink
            to="/framework-setup"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/framework-record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Frameworks 🧠
          </NavLink>

          <NavLink
            to="/drill-setup"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/drill-record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Drills 🎯
          </NavLink>

          <NavLink
            to="/ladder-setup"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/ladder-record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Ladders 🪜
          </NavLink>

          <NavLink
            to="/slide-setup"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive || location.pathname === '/slide-record'
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Decks 🖼️
          </NavLink>

          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 no-underline font-sans shrink-0 ${
                isActive
                  ? 'bg-[#c47a4a] text-[#1a1612] font-semibold shadow-sm'
                  : 'text-[#f4e8d6]/70 hover:text-[#f4e8d6] hover:bg-[#f4e8d6]/10'
              }`
            }
          >
            Compare ↔
          </NavLink>
        </div>

        {/* Right: Firebase Auth Button (Always Visible) */}
        <div className="shrink-0 pl-1 flex items-center">
          {user ? (
            <button
              onClick={handleAuthAction}
              className="flex items-center gap-2 bg-[#f4e8d6]/10 border border-[#f4e8d6]/20 rounded-full px-3 py-1.5 text-[12px] text-[#f4e8d6] hover:border-[#c47a4a] transition-all cursor-pointer shadow-sm"
              title="Click to sign out"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-5 h-5 rounded-full" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-[#c47a4a] text-[#1a1612] text-[10px] font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0]}
                </span>
              )}
              <span className="hidden sm:inline font-medium">{user.displayName?.split(' ')[0] || 'Account'}</span>
            </button>
          ) : (
            <button
              onClick={handleAuthAction}
              className="text-[12px] bg-[#c47a4a] text-[#1a1612] font-semibold px-3.5 py-1.5 rounded-full cursor-pointer transition-all hover:bg-[#e0925c] active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
            >
              Sign In 🌐
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
