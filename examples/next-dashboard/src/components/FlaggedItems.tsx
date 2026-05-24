import type { FlaggedItem } from '../types/api';
import { AlertTriangle, Info, XOctagon } from 'lucide-react';

const severityConfig: Record<FlaggedItem['severity'], {
  border: string;
  bg: string;
  text: string;
  icon: typeof Info;
  iconColor: string;
  badge: string;
}> = {
  info: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    icon: Info,
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  warning: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  critical: {
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    icon: XOctagon,
    iconColor: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300',
  },
};

interface FlaggedItemsProps {
  items: FlaggedItem[];
}

export function FlaggedItems({ items }: FlaggedItemsProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">No flagged items returned.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {items.map((item, index) => {
        const config = severityConfig[item.severity];
        const IconComponent = config.icon;
        return (
          <div
            key={`${item.id}-${index}`}
            className={`rounded-lg sm:rounded-xl border ${config.border} ${config.bg} px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 hover:translate-x-1 animate-slide-up opacity-0`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <IconComponent size={14} className={`${config.iconColor} flex-shrink-0 sm:hidden`} />
              <IconComponent size={16} className={`${config.iconColor} flex-shrink-0 hidden sm:block`} />
              <span className={`font-semibold ${config.text} text-xs sm:text-sm truncate`}>{item.id}</span>
              <span
                className={`rounded-full ${config.badge} px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex-shrink-0`}
              >
                {item.severity}
              </span>
            </div>
            <p className={`mt-1 sm:mt-1.5 text-xs sm:text-sm ${config.text} opacity-80 pl-5 sm:pl-7`}>
              {item.reason}
            </p>
          </div>
        );
      })}
    </div>
  );
}
