export default function EarningsChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 640, H = 230, pl = 52, pr = 12, pt = 12, pb = 30;
  const top = Math.max(100, Math.ceil(Math.max(...data.map((d) => d.value)) / 100) * 100);
  const x = (i: number) => pl + (i * (W - pl - pr)) / (data.length - 1);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / top);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - pb} L${x(0)},${H - pb} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Earnings for the last 7 days">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b04717" stopOpacity="0.25" />
          <stop offset="1" stopColor="#b04717" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={y(top * t)} y2={y(top * t)} stroke="#eadfd6" strokeDasharray="4 4" />
          <text x={pl - 8} y={y(top * t) + 4} textAnchor="end" className="axis">₹{Math.round(top * t)}</text>
        </g>
      ))}
      <path d={area} fill="url(#fade)" />
      <path d={line} fill="none" stroke="#b04717" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#fffdf9" stroke="#b04717" strokeWidth="2" />
          <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}
