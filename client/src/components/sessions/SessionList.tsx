import { Badge } from '../ui/Badge';
import { useSessions } from '../../api/sessions';
import { cn } from '../../lib/utils';
import type { SessionPlan, GamePhase } from '../../types';

const PHASE_COLORS: Record<GamePhase, string> = {
  'Attacking': 'bg-green-900 text-green-300',
  'Attacking to Defending Transition': 'bg-yellow-900 text-yellow-300',
  'Defending': 'bg-red-900 text-red-300',
  'Defending to Attacking Transition': 'bg-blue-900 text-blue-300',
  'Other': 'bg-navy-700 text-white',
};

interface SessionListProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function SessionList({ selectedId, onSelect }: SessionListProps) {
  const { data: sessions = [], isLoading } = useSessions();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <p className="text-xs text-muted px-4 py-3">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted px-4 py-3">No sessions yet. Create one to get started.</p>
        ) : (
          sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              selected={selectedId === s.id}
              onSelect={() => onSelect(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: SessionPlan;
  selected: boolean;
  onSelect: () => void;
}

function SessionRow({ session, selected, onSelect }: SessionRowProps) {
  const phaseColor = PHASE_COLORS[session.game_phase] ?? 'bg-navy-700 text-white';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-4 py-3 cursor-pointer border-l-2 transition-colors',
        selected
          ? 'border-gold bg-navy-800 text-white'
          : 'border-transparent text-muted hover:bg-navy-800 hover:text-white'
      )}
    >
      <p className="text-sm font-medium truncate text-white">{session.title}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Badge className={cn('text-xs', phaseColor)}>{session.game_phase}</Badge>
        {(session.activity_count ?? 0) > 0 && (
          <span className="text-xs text-muted">{session.activity_count}/6 activities</span>
        )}
      </div>
    </div>
  );
}
