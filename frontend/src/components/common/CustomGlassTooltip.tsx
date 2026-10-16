import React from 'react';

interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
  dataKey?: string;
  unit?: string;
}

interface CustomGlassTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  titlePrefix?: string;
  unit?: string;
  formatter?: (value: any, name: string) => [string, string];
}

export const CustomGlassTooltip: React.FC<CustomGlassTooltipProps> = ({
  active,
  payload,
  label,
  titlePrefix = '',
  unit = '',
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="glass-modal !p-3 !rounded-xl !bg-[#11131D]/90 !backdrop-blur-xl border border-white/15 shadow-2xl text-xs space-y-1.5 min-w-[140px] pointer-events-none transition-all duration-150">
      {label !== undefined && label !== null && (
        <div className="text-[11px] font-bold text-[#85879C] uppercase tracking-wider border-b border-white/10 pb-1 flex items-center justify-between">
          <span>{titlePrefix ? `${titlePrefix} ${label}` : label}</span>
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => {
          let displayVal = item.value;
          let displayName = item.name;

          if (formatter) {
            const formatted = formatter(item.value, item.name);
            displayVal = formatted[0];
            displayName = formatted[1];
          } else if (unit && typeof displayVal === 'number') {
            displayVal = `${displayVal}${unit}`;
          }

          const dotColor = item.color || item.fill || '#A78BFA';

          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shadow-xs shrink-0"
                  style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
                />
                <span className="text-[#B7B8C8] text-[11px] font-medium">{displayName}</span>
              </div>
              <span className="font-bold text-white text-[12px] font-mono">{displayVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
