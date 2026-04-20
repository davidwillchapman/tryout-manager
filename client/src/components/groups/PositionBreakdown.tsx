import { useState } from 'react';
import { cn } from '../../lib/utils';
import { aggregateByGroup, POSITION_GROUPS } from '../../lib/positions';
import type { PositionBreakdown as BreakdownData } from '../../types';

type Mode = 'primary' | 'secondary' | 'combined';

interface PositionBreakdownProps {
  data: BreakdownData;
}

export function PositionBreakdown({ data }: PositionBreakdownProps) {
  const [mode, setMode] = useState<Mode>('combined');

  const counts = aggregateByGroup(data[mode]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(['primary', 'secondary', 'combined'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-2.5 py-1 text-xs rounded capitalize transition-colors',
              mode === m
                ? 'bg-gold text-navy-950 font-semibold'
                : 'text-muted hover:text-white hover:bg-navy-700'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted italic">No players assigned</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {POSITION_GROUPS.map((group) => (
              <div key={group} className="text-center">
                <div className="text-lg font-bold text-white">{counts[group]}</div>
                <div className="text-xs text-muted">{group}</div>
              </div>
            ))}
          </div>

          <div className="flex rounded overflow-hidden h-2 bg-navy-700 gap-px">
            {POSITION_GROUPS.map((group, i) => {
              const pct = total > 0 ? (counts[group] / total) * 100 : 0;
              if (pct === 0) return null;
              const opacity = [1, 0.75, 0.55, 0.35][i];
              return (
                <div
                  key={group}
                  style={{ width: `${pct}%`, backgroundColor: `rgba(252,207,9,${opacity})` }}
                  title={`${group}: ${counts[group]}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
