import { useState, useRef, useEffect } from 'react';

export default function Tooltip() {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [msg, setMsg] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      // Check for elements with title attribute (our annotated spans)
      const el = e.target.closest('[title]');
      if (el && el.classList.contains('hl-filler')) {
        const rect = el.getBoundingClientRect();
        setMsg(el.getAttribute('title'));
        setPos({
          x: Math.min(rect.left + 14, window.innerWidth - 240),
          y: rect.top - 50,
        });
        setShow(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setShow(false), 2800);
      }
    };

    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed bg-surface2 border border-border-hi rounded-lg px-3.5 py-2 text-[12px] text-text max-w-[220px] pointer-events-none z-[9999] leading-[1.55] transition-opacity duration-[180ms]"
      style={{ left: pos.x, top: pos.y }}
    >
      {msg}
    </div>
  );
}
