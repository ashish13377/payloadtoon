import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  accentColor?: string;
}

export function MetricCard({ label, value, helper, icon, accentColor = 'accent' }: MetricCardProps) {
  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    accent: {
      bg: 'bg-accent-muted',
      text: 'text-accent-light',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',
    },
    success: {
      bg: 'bg-success-muted',
      text: 'text-success',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    warning: {
      bg: 'bg-warning-muted',
      text: 'text-warning',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    danger: {
      bg: 'bg-danger-muted',
      text: 'text-danger',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    },
  };

  const colors = colorMap[accentColor] || colorMap.accent;

  return (
    <div className="glass-card group rounded-xl sm:rounded-2xl p-3.5 sm:p-5 animate-scale-in opacity-0">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-sm font-medium text-slate-400 tracking-wide truncate">{label}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold tracking-tight text-white tabular-nums truncate">
            {value}
          </p>
        </div>
        {icon ? (
          <div
            className={`rounded-lg sm:rounded-xl ${colors.bg} p-2 sm:p-3 ${colors.text} ${colors.glow} transition-all duration-300 group-hover:scale-110 flex-shrink-0`}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? (
        <p className="mt-2 sm:mt-3 text-[10px] sm:text-sm text-slate-500 truncate">{helper}</p>
      ) : null}
    </div>
  );
}
