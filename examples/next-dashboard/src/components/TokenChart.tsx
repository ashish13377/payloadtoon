'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LedgerDailyPoint } from '../types/api';

interface TokenChartProps {
  data: LedgerDailyPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 border border-white/10">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white tabular-nums">
        {Number(payload[0].value).toLocaleString()}
      </p>
      <p className="text-xs text-accent-light">tokens saved</p>
    </div>
  );
};

export function TokenChart({ data }: TokenChartProps) {
  return (
    <div className="h-48 sm:h-64 md:h-80 w-full animate-fade-in opacity-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity={1} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
          />
          <Bar
            dataKey="total_tokens_saved"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
