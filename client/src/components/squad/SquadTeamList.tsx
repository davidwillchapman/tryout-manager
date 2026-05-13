import { Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SquadTeam } from '../../types';

type Filter = 'all' | 'active' | 'inactive';

interface Props {
  teams: SquadTeam[];
  selectedId: number | null;
  filter: Filter;
  onSelect: (id: number) => void;
  onFilterChange: (f: Filter) => void;
}

export function SquadTeamList({ teams, selectedId, filter, onSelect, onFilterChange }: Props) {
  const filtered = teams.filter((t) => {
    if (filter === 'active') return t.is_active;
    if (filter === 'inactive') return !t.is_active;
    return true;
  });

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-2 pb-1 border-b border-navy-700 shrink-0">
        {(['all', 'active', 'inactive'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              'flex-1 text-xs py-1 capitalize transition-colors',
              filter === f
                ? 'text-white border-b-2 border-gold -mb-[1px]'
                : 'text-muted hover:text-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted text-xs px-4 text-center">
            <Users size={24} className="mb-2 text-navy-600" />
            No teams found
          </div>
        ) : (
          filtered.map((team) => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-navy-800 transition-colors',
                selectedId === team.id
                  ? 'bg-navy-700'
                  : 'hover:bg-navy-800'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{team.name}</p>
                  {team.season_label && (
                    <p className="text-xs text-muted truncate">{team.season_label}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      team.is_active
                        ? 'bg-emerald-900/60 text-emerald-400'
                        : 'bg-navy-700 text-muted'
                    )}
                  >
                    {team.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] text-muted">
                    {team.player_count ?? 0} players
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
