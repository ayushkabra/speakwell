import { getMetricColor, getMetricNote } from '../lib/metricsEngine';

const LABELS = {
  wpm: 'Pace',
  clarity: 'Clarity',
  flow: 'Flow',
  fillers: 'Fillers',
  grammar: 'Grammar',
  pauses: 'Pauses',
};

const COLOR_MAP = {
  good: 'text-green',
  warn: 'text-orange',
  bad: 'text-red',
};

export default function MetricCard({ metricKey, value }) {
  const color = getMetricColor(metricKey, value);
  const note = getMetricNote(metricKey, value);

  return (
    <div className="bg-surface border border-border/50 rounded-xl p-[18px_16px] flex flex-col items-center gap-1 text-center">
      <div className="text-[10px] tracking-[0.12em] uppercase text-text3">
        {LABELS[metricKey] || metricKey}
      </div>
      <div className={`font-serif text-[30px] leading-none font-normal ${COLOR_MAP[color]}`}>
        {value}
      </div>
      <div className="text-[10px] text-text3 leading-[1.4]">{note}</div>
    </div>
  );
}
