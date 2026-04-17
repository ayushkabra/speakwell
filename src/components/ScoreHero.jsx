export default function ScoreHero({ score, context, duration, note }) {
  return (
    <div className="flex items-center gap-7 p-[28px_32px] bg-surface border border-border-md rounded-2xl mb-7 max-[680px]:flex-col max-[680px]:text-center">
      <div className="font-serif text-[72px] italic text-accent leading-none shrink-0">
        {score}
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-text3 tracking-[0.08em] uppercase mb-1.5">
          Overall score
        </div>
        <div className="text-[14px] text-text2 mb-2.5">{context} · {duration} · Auto-detected</div>
        <div className="text-[13px] text-text3 italic leading-[1.6]">{note}</div>
      </div>
    </div>
  );
}
