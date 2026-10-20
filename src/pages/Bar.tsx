export default function Bar({ value, max, small }: { value: number; max: number; small?: boolean }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = pct >= 85 ? 'good' : pct >= 60 ? 'mid' : 'low';
  return (
    <div className={`bar ${small ? 'small' : ''}`}>
      <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
