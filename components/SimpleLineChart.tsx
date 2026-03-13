
import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface Props {
  data: ChartData[];
  color?: string;
  height?: number;
}

export const SimpleLineChart: React.FC<Props> = ({ data, color = '#10b981', height = 90 }) => {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1; 

  const padding = 5;
  // Reserve space for labels at the bottom (approx 15px)
  const labelHeight = 15;
  const graphHeight = height - labelHeight - (padding * 2);

  const width = 300; 
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = graphHeight - ((d.value - min) / range) * graphHeight + padding;
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M ${data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = graphHeight - ((d.value - min) / range) * graphHeight + padding;
    return `${x} ${y}`;
  }).join(' L ')}`;

  const fillD = `${pathD} L ${width} ${graphHeight + padding} L 0 ${graphHeight + padding} Z`;

  return (
    <div className="w-full flex flex-col justify-end" style={{ height: `${height}px` }}>
        {/* SVG Graph Area */}
        <div className="flex-1 w-full relative overflow-visible">
            <svg viewBox={`0 0 ${width} ${graphHeight + padding * 2}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`chartGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                
                <path d={fillD} fill={`url(#chartGradient-${color})`} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * width;
                    const y = graphHeight - ((d.value - min) / range) * graphHeight + padding;
                    return (
                        <circle key={i} cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" />
                    );
                })}
            </svg>
        </div>
        
        {/* X-Axis Labels (Months) */}
        <div className="flex justify-between px-1 mt-1 border-t border-white/10 pt-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80">{data[0].label}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80">{data[data.length-1].label}</span>
        </div>
    </div>
  );
};
