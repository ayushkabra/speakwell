import { useNavigate } from 'react-router-dom';
import useSessionStore from '../store/useSessionStore';
import ChipGrid from '../components/ChipGrid';

export default function Context() {
  const navigate = useNavigate();
  const selectedContext = useSessionStore((s) => s.selectedContext);
  const customContext = useSessionStore((s) => s.customContext);
  const setContext = useSessionStore((s) => s.setContext);
  const setCustomContext = useSessionStore((s) => s.setCustomContext);

  const handleStart = () => {
    navigate('/record');
  };

  return (
    <div className="animate-fade-up w-full max-w-[720px] mx-auto px-6 pt-[72px] pb-20 max-[680px]:px-5">
      {/* Header */}
      <div className="mb-11">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text3 mb-3">
          New session
        </div>
        <h2 className="font-serif text-[34px] leading-[1.15] font-normal mb-2.5 max-[680px]:text-[26px]">
          What are you<br />
          <em className="italic text-accent">preparing for?</em>
        </h2>
        <p className="text-[13px] text-text2 leading-[1.7] mt-2.5">
          Optional — or skip and just start talking.
        </p>
      </div>

      {/* Context chips */}
      <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5">
        Choose a context
      </div>
      <ChipGrid selected={selectedContext} onSelect={setContext} />

      {/* Custom context */}
      <div className="mb-9">
        <div className="text-[10px] tracking-[0.18em] uppercase text-text3 mb-3.5">
          Anything specific? <span className="text-[10px] text-text3 tracking-normal">(optional)</span>
        </div>
        <textarea
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder='"Pitching my startup to investors in Hindi"'
          rows="3"
          className="w-full bg-surface border border-border-md rounded-xl p-[14px_18px] font-sans text-[14px] text-text font-light resize-none outline-none transition-[border-color] duration-200 min-h-[76px] leading-[1.6] placeholder:text-text3 focus:border-accent-border"
        />
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleStart}
          className="inline-flex items-center gap-2 bg-accent text-[#0e0e0d] border-none rounded-[10px] px-7 py-3.5 font-sans text-[14px] font-medium cursor-pointer transition-all duration-[180ms] tracking-[0.01em] hover:opacity-86 active:scale-[0.96]"
        >
          Set context & start →
        </button>
        <button
          onClick={handleStart}
          className="inline-flex items-center gap-2 bg-transparent text-text2 border border-border-md rounded-[10px] px-6 py-[13px] font-sans text-[13px] font-light cursor-pointer transition-all duration-[180ms] hover:border-border-hi hover:text-text"
        >
          Skip — just start talking
        </button>
      </div>
    </div>
  );
}
