import useSessionStore from '../store/useSessionStore';

const STEPS = [
  'Transcribing your speech',
  'Analysing delivery',
  'De-cluttering & polishing authentic script',
  'Building your scorecard',
];

export default function Processing() {
  const processingStep = useSessionStore((s) => s.processingStep);

  return (
    <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 min-h-[calc(100vh-60px)] flex flex-col items-center justify-center gap-7 text-center">
      <div className="w-[52px] h-[52px] rounded-full border-[1.5px] border-border-md border-t-accent animate-spin-slow" />
      <div className="font-serif text-[26px] italic text-text">Listening closely…</div>
      <div className="flex flex-col gap-3 text-left min-w-[280px]">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = processingStep > stepNum;
          const isCurrent = processingStep === stepNum;
          let dotClass = 'border-border-md';
          if (isDone) dotClass = 'bg-green-dim border-[rgba(121,191,156,0.3)] text-green';
          else if (isCurrent) dotClass = 'bg-accent-dim border-accent-border text-accent animate-pulse-slow';
          let textClass = 'text-text3';
          if (isDone) textClass = 'text-text';
          else if (isCurrent) textClass = 'text-accent';
          return (
            <div key={stepNum} className={`flex items-center gap-3 text-[13px] transition-colors duration-[350ms] ${textClass}`}>
              <div className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center text-[10px] shrink-0 transition-all duration-[350ms] ${dotClass}`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
