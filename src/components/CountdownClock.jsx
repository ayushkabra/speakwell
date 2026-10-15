import React from 'react';

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function CountdownClock({
  timeRemaining = 0,
  totalSecs = 0,
  isRecording = false,
  isPaused = false,
  isTimerHidden = false,
  onToggleHidden,
  isMuted = false,
  onToggleMute,
  size = 190,
}) {
  const isCountdown = totalSecs > 0;
  const progressRatio = isCountdown ? Math.max(0, Math.min(1, timeRemaining / totalSecs)) : 1;

  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isCountdown
    ? circumference - progressRatio * circumference
    : 0;

  const isUrgent = isCountdown && timeRemaining <= 5 && timeRemaining > 0 && isRecording;
  const isWarning = isCountdown && timeRemaining <= 15 && timeRemaining > 5 && isRecording;
  const isTimeUp = isCountdown && timeRemaining === 0 && isRecording;

  let ringColor = 'stroke-accent';
  let textColor = 'text-text';

  if (isTimeUp || isUrgent) {
    ringColor = 'stroke-red-500';
    textColor = 'text-red-400';
  } else if (isWarning) {
    ringColor = 'stroke-orange';
    textColor = 'text-orange';
  }

  return (
    <div className="relative flex flex-col items-center justify-center my-3 select-none">
      {/* Sound Mute Toggle Button */}
      {onToggleMute && (
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute countdown sounds' : 'Mute countdown sounds'}
          className="absolute -top-3 right-0 text-[13px] text-text3 hover:text-text bg-surface2/60 border border-border px-2.5 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1 z-10"
        >
          <span>{isMuted ? '🔇' : '🔊'}</span>
          <span className="text-[10px] uppercase font-mono tracking-wider">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>
      )}

      {/* Circular SVG Ring */}
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center cursor-pointer group"
        onClick={onToggleHidden}
        title="Click to hide/show timer"
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border-md/40"
          />

          {/* Animated Progress Ring */}
          {isCountdown ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-500 ease-linear ${ringColor} ${
                isUrgent ? 'animate-pulse' : ''
              }`}
            />
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              strokeWidth={strokeWidth}
              className={`stroke-accent/40 ${isRecording && !isPaused ? 'animate-pulse' : ''}`}
            />
          )}
        </svg>

        {/* Center Time Display */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
            isTimerHidden ? 'opacity-[0.08]' : 'opacity-100'
          }`}
        >
          <div
            className={`font-serif text-[42px] sm:text-[48px] leading-none tracking-[-0.03em] ${textColor} ${
              isUrgent ? 'animate-bounce font-bold' : ''
            }`}
          >
            {fmt(timeRemaining)}
          </div>

          <div className="text-[10px] text-text3 tracking-[0.16em] uppercase mt-2 font-mono flex items-center gap-1.5">
            {isCountdown ? (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-red-500 animate-ping' : 'bg-accent'}`} />
                <span>{timeRemaining === 0 ? "Time's Up" : 'Remaining'}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-ping" />
                <span>Elapsed</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tap hint */}
      <div
        onClick={onToggleHidden}
        className="text-[10px] text-text3 tracking-[0.14em] uppercase cursor-pointer hover:text-text transition-colors mt-2"
      >
        tap clock to {isTimerHidden ? 'show' : 'hide'}
      </div>
    </div>
  );
}
