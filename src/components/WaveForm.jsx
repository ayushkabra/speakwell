import { useEffect, useRef, useState } from 'react';

export default function WaveForm({ isActive = false, barCount = 32 }) {
  const [heights, setHeights] = useState(Array(barCount).fill(4));
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setHeights(
          Array.from({ length: barCount }, () => Math.random() * 36 + 4)
        );
      }, 100);
    } else {
      clearInterval(intervalRef.current);
      setHeights(Array(barCount).fill(4));
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, barCount]);

  return (
    <div className="flex items-center justify-center gap-[3px] w-[240px] h-12 mb-7">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm bg-accent transition-[height] duration-[80ms] ease-linear"
          style={{
            height: `${h}px`,
            opacity: isActive ? 0.6 : 0.22,
          }}
        />
      ))}
    </div>
  );
}
