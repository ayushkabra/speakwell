const CONTEXTS = [
  { icon: '💼', label: 'Job Interview', hint: 'Answer with structure' },
  { icon: '📞', label: 'Sales Call', hint: 'Pitch with confidence' },
  { icon: '🤝', label: 'Difficult Talk', hint: 'Say the hard thing' },
  { icon: '🚀', label: 'Team Pitch', hint: 'Lead the room' },
  { icon: '🎙', label: 'Free Talk', hint: 'No agenda, just talk' },
  { icon: '📊', label: 'Presentation', hint: 'Deliver with impact' },
];

export default function ChipGrid({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mb-8 max-[680px]:grid-cols-2">
      {CONTEXTS.map((ctx) => (
        <button
          key={ctx.label}
          onClick={() => onSelect(ctx.label)}
          className={`bg-surface border rounded-xl p-[18px_16px] cursor-pointer transition-all duration-[180ms] flex flex-col gap-[5px] text-left
            ${
              selected === ctx.label
                ? 'border-accent-border bg-accent-dim'
                : 'border-border-md hover:border-border-hi hover:bg-surface2'
            }`}
        >
          <div className="text-[20px]">{ctx.icon}</div>
          <div
            className={`text-[13px] font-medium ${
              selected === ctx.label ? 'text-accent' : 'text-text'
            }`}
          >
            {ctx.label}
          </div>
          <div className="text-[11px] text-text3">{ctx.hint}</div>
        </button>
      ))}
    </div>
  );
}
