import { NavLink, useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#161c1a]/85 backdrop-blur-md border border-[#f4e8d61f] rounded-full px-4 py-2 flex items-center gap-1 sm:gap-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] max-w-[920px] w-full justify-between overflow-x-auto no-scrollbar">
        {/* Brand Logo */}
        <NavLink
          to="/"
          className="font-serif italic text-[19px] sm:text-[21px] text-[#f4e8d6] tracking-[-0.02em] cursor-pointer no-underline flex items-center gap-1 shrink-0 pl-1 pr-2 font-medium"
        >
          speakwell<span className="w-1.5 h-1.5 rounded-full bg-[#c47a4a] inline-block" />
        </NavLink>

        {/* Links */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
      </nav>
    </div>
  );
}
