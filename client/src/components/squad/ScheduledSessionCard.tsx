import { Circle, Clock, CheckCircle2, Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';
import type { ScheduledSessionSummary, EvaluationStatus, GamePhase } from '../../types';
import { cn } from '../../lib/utils';

const PHASE_COLORS: Record<GamePhase, string> = {
  'Attacking': 'bg-green-900/60 text-green-400',
  'Attacking to Defending Transition': 'bg-yellow-900/60 text-yellow-400',
  'Defending': 'bg-red-900/60 text-red-400',
  'Defending to Attacking Transition': 'bg-blue-900/60 text-blue-400',
  'Other': 'bg-navy-700 text-muted',
};

function StatusIcon({ status }: { status: EvaluationStatus }) {
  if (status === 'complete') return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === 'in_progress') return <Clock size={14} className="text-amber-400" />;
  return <Circle size={14} className="text-muted" />;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  session: ScheduledSessionSummary;
  onClick: () => void;
  onDelete: () => void;
}

export function ScheduledSessionCard({ session, onClick, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const phaseColor = PHASE_COLORS[session.game_phase] ?? 'bg-navy-700 text-muted';

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirming) {
      onDelete();
    } else {
      setConfirming(true);
    }
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(false);
  }

  return (
    <div
      onClick={onClick}
      className="group relative border border-navy-700 rounded-lg p-3 cursor-pointer hover:border-navy-500 hover:bg-navy-800/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-white">{formatDate(session.date)}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', phaseColor)}>
              {session.game_phase}
            </span>
          </div>
          <p className="text-sm font-medium text-white truncate">{session.title}</p>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{session.overall_objective}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon status={session.evaluation_status} />
          {confirming ? (
            <>
              <button onClick={handleDelete} className="text-red-400 hover:text-red-300 p-1">
                <Check size={13} />
              </button>
              <button onClick={handleCancelDelete} className="text-muted hover:text-white p-1">
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={handleDelete}
              className="text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete session"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
