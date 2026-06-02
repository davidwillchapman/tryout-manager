import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectItem } from '../ui/Select';
import {
  useScheduledSession,
  useUpdateScheduledSession,
  useUpdateScheduledActivity,
  useAddScheduledPlayer,
  useUpdateScheduledPlayer,
  useRemoveScheduledPlayer,
} from '../../api/scheduledSessions';
import type {
  ScheduledSessionActivity,
  ScheduledSessionPlayer,
  GamePhase,
  EvaluationStatus,
  AttendanceStatus,
  EvalMark,
} from '../../types';
import { cn } from '../../lib/utils';

type InnerTab = 'details' | 'players' | 'evaluation';

const GAME_PHASES: GamePhase[] = [
  'Attacking',
  'Attacking to Defending Transition',
  'Defending',
  'Defending to Attacking Transition',
  'Other',
];

const PHASE_COLORS: Record<GamePhase, string> = {
  'Attacking': 'bg-green-900/60 text-green-400',
  'Attacking to Defending Transition': 'bg-yellow-900/60 text-yellow-400',
  'Defending': 'bg-red-900/60 text-red-400',
  'Defending to Attacking Transition': 'bg-blue-900/60 text-blue-400',
  'Other': 'bg-navy-700 text-muted',
};

const EVAL_STATUS_LABELS: Record<EvaluationStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
};

// ─── 1–10 rating picker ───────────────────────────────────────────────────────
function RatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            'w-7 h-7 rounded text-xs font-medium transition-colors',
            value === n
              ? 'bg-gold text-navy-900'
              : 'bg-navy-700 text-muted hover:bg-navy-600 hover:text-white'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Details tab ──────────────────────────────────────────────────────────────
function DetailsTab({ sessionId }: { sessionId: number }) {
  const { data: session } = useScheduledSession(sessionId);
  const update = useUpdateScheduledSession();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (!session) return null;

  function startEdit(field: string, current: string) {
    setEditingField(field);
    setDraft({ [field]: current });
  }

  function saveField(field: string) {
    update.mutate({ id: sessionId, [field]: draft[field] });
    setEditingField(null);
  }

  function cancelEdit() {
    setEditingField(null);
    setDraft({});
  }

  const phaseColor = PHASE_COLORS[session.game_phase] ?? 'bg-navy-700 text-muted';

  return (
    <div className="space-y-4 p-4 overflow-y-auto flex-1">
      {/* Meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', phaseColor)}>
            {session.game_phase}
          </span>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-muted mb-1">Date</label>
          {editingField === 'date' ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ date: e.target.value })}
                className="h-7 text-xs w-44"
              />
              <Button size="sm" onClick={() => saveField('date')}>Save</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => startEdit('date', session.date)}
              className="text-sm text-white hover:text-gold transition-colors"
            >
              {session.date}
            </button>
          )}
        </div>

        {/* Game Phase */}
        <div>
          <label className="block text-xs text-muted mb-1">Game Phase</label>
          <Select
            value={session.game_phase}
            onValueChange={(v) => update.mutate({ id: sessionId, game_phase: v as GamePhase })}
          >
            {GAME_PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </Select>
        </div>

        {/* Objective */}
        <div>
          <label className="block text-xs text-muted mb-1">Objective</label>
          {editingField === 'overall_objective' ? (
            <div className="space-y-1">
              <Textarea
                value={draft.overall_objective}
                onChange={(e) => setDraft({ overall_objective: e.target.value })}
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveField('overall_objective')}>Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p
              onClick={() => startEdit('overall_objective', session.overall_objective)}
              className="text-sm text-white cursor-pointer hover:text-gold transition-colors"
            >
              {session.overall_objective || <span className="text-muted italic">Click to add…</span>}
            </p>
          )}
        </div>
      </div>

      {/* Activities */}
      {session.activities.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Activities</h3>
          <div className="space-y-3">
            {session.activities.map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity }: { activity: ScheduledSessionActivity }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-navy-700 rounded-lg p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{activity.title}</p>
            {activity.summary && (
              <p className="text-xs text-muted mt-0.5 line-clamp-1">{activity.summary}</p>
            )}
          </div>
          {activity.duration_minutes && (
            <span className="text-xs text-muted shrink-0">{activity.duration_minutes}m</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-navy-700">
          {activity.description && (
            <p className="text-xs text-muted whitespace-pre-wrap">{activity.description}</p>
          )}
          {activity.coaching_points && (
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Coaching Points</p>
              <p className="text-xs text-white">{activity.coaching_points}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Players tab ──────────────────────────────────────────────────────────────
function PlayersTab({ sessionId }: { sessionId: number }) {
  const { data: session } = useScheduledSession(sessionId);
  const addPlayer = useAddScheduledPlayer(sessionId);
  const updatePlayer = useUpdateScheduledPlayer(sessionId);
  const removePlayer = useRemoveScheduledPlayer(sessionId);

  const [guestName, setGuestName] = useState('');

  if (!session) return null;

  function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim()) return;
    addPlayer.mutate(guestName.trim(), { onSuccess: () => setGuestName('') });
  }

  function cycleAttendance(player: ScheduledSessionPlayer) {
    const order: Array<AttendanceStatus | null> = [null, 'attended', 'excused', 'unexcused'];
    const current = player.attendance;
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    updatePlayer.mutate({ rowId: player.id, attendance: next });
  }

  function toggleEvalMark(player: ScheduledSessionPlayer, mark: EvalMark) {
    const next = player.eval_mark === mark ? null : mark;
    updatePlayer.mutate({ rowId: player.id, eval_mark: next });
  }

  const topCount = session.players.filter((p) => p.eval_mark === 'top').length;
  const bottomCount = session.players.filter((p) => p.eval_mark === 'bottom').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {session.players.map((player) => {
          const canTop = player.eval_mark === 'top' || topCount < 3;
          const canBottom = player.eval_mark === 'bottom' || bottomCount < 2;

          return (
            <div
              key={player.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-navy-800/60 group"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm text-white">{player.name}</span>
                {player.is_guest === 1 && (
                  <span className="ml-1.5 text-[9px] bg-amber-900/60 text-amber-400 px-1 py-0.5 rounded">Guest</span>
                )}
              </div>

              {/* Attendance cycle */}
              <button
                onClick={() => cycleAttendance(player)}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                  player.attendance === 'attended'
                    ? 'border-emerald-600 text-emerald-400'
                    : player.attendance === 'excused'
                    ? 'border-blue-600 text-blue-400'
                    : player.attendance === 'unexcused'
                    ? 'border-red-600 text-red-400'
                    : 'border-navy-600 text-muted hover:border-navy-500'
                )}
              >
                {player.attendance ?? '—'}
              </button>

              {/* Top mark */}
              <button
                onClick={() => canTop && toggleEvalMark(player, 'top')}
                disabled={!canTop && player.eval_mark !== 'top'}
                title="Top performer"
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded transition-colors',
                  player.eval_mark === 'top'
                    ? 'bg-emerald-800 text-emerald-300'
                    : canTop
                    ? 'text-muted hover:text-emerald-400'
                    : 'text-navy-600 cursor-not-allowed'
                )}
              >
                ▲
              </button>

              {/* Bottom mark */}
              <button
                onClick={() => canBottom && toggleEvalMark(player, 'bottom')}
                disabled={!canBottom && player.eval_mark !== 'bottom'}
                title="Needs work"
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded transition-colors',
                  player.eval_mark === 'bottom'
                    ? 'bg-red-900 text-red-300'
                    : canBottom
                    ? 'text-muted hover:text-red-400'
                    : 'text-navy-600 cursor-not-allowed'
                )}
              >
                ▼
              </button>

              {/* Remove guest */}
              {player.is_guest === 1 && (
                <button
                  onClick={() => removePlayer.mutate(player.id)}
                  className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add guest */}
      <form onSubmit={handleAddGuest} className="flex gap-2 p-3 border-t border-navy-700 shrink-0">
        <Input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Guest name…"
          className="h-7 text-xs flex-1"
        />
        <Button type="submit" size="sm" disabled={!guestName.trim() || addPlayer.isPending}>
          + Guest
        </Button>
      </form>
    </div>
  );
}

// ─── Evaluation tab ───────────────────────────────────────────────────────────
function EvaluationTab({ sessionId }: { sessionId: number }) {
  const { data: session } = useScheduledSession(sessionId);
  const update = useUpdateScheduledSession();

  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  if (!session) return null;

  function saveNotes() {
    update.mutate({ id: sessionId, evaluation_notes: notesDraft ?? session!.evaluation_notes });
    setNotesDraft(null);
  }

  const topPlayers = session.players.filter((p) => p.eval_mark === 'top');
  const bottomPlayers = session.players.filter((p) => p.eval_mark === 'bottom');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Status */}
      <div>
        <label className="block text-xs text-muted mb-1">Evaluation Status</label>
        <Select
          value={session.evaluation_status}
          onValueChange={(v) => update.mutate({ id: sessionId, evaluation_status: v as EvaluationStatus })}
        >
          {(Object.entries(EVAL_STATUS_LABELS) as [EvaluationStatus, string][]).map(([v, label]) => (
            <SelectItem key={v} value={v}>{label}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Session rating */}
      <div>
        <label className="block text-xs text-muted mb-1">Session Rating (1–10)</label>
        <RatingPicker
          value={session.overall_rating}
          onChange={(r) => update.mutate({ id: sessionId, overall_rating: r })}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-muted mb-1">Evaluation Notes</label>
        <Textarea
          className="text-xs min-h-[80px]"
          value={notesDraft ?? session.evaluation_notes ?? ''}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          placeholder="Overall session notes…"
        />
      </div>

      {/* Per-activity ratings */}
      {session.activities.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Activity Ratings</h3>
          <div className="space-y-3">
            {session.activities.map((act) => (
              <ActivityEvalRow
                key={act.id}
                activity={act}
                sessionId={sessionId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top / Bottom */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Top ({topPlayers.length}/3)
          </h3>
          {topPlayers.length === 0 ? (
            <p className="text-xs text-muted italic">None marked</p>
          ) : (
            topPlayers.map((p) => (
              <p key={p.id} className="text-xs text-white">{p.name}</p>
            ))
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
            Needs Work ({bottomPlayers.length}/2)
          </h3>
          {bottomPlayers.length === 0 ? (
            <p className="text-xs text-muted italic">None marked</p>
          ) : (
            bottomPlayers.map((p) => (
              <p key={p.id} className="text-xs text-white">{p.name}</p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityEvalRow({
  activity,
  sessionId,
}: {
  activity: ScheduledSessionActivity;
  sessionId: number;
}) {
  const updateActivity = useUpdateScheduledActivity();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  function saveNotes() {
    updateActivity.mutate({ sessionId, activityId: activity.id, notes: notesDraft ?? activity.notes });
    setNotesDraft(null);
  }

  return (
    <div className="border border-navy-700 rounded p-3 space-y-2">
      <p className="text-xs font-medium text-white">{activity.title}</p>
      <div>
        <label className="block text-[10px] text-muted mb-1">Rating (1–10)</label>
        <RatingPicker
          value={activity.rating}
          onChange={(r) => updateActivity.mutate({ sessionId, activityId: activity.id, rating: r })}
        />
      </div>
      <div>
        <label className="block text-[10px] text-muted mb-1">Notes</label>
        <Textarea
          className="text-xs min-h-[50px]"
          value={notesDraft ?? activity.notes ?? ''}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          placeholder="Notes on this activity…"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  sessionId: number;
  onBack: () => void;
}

export function ScheduledSessionDetail({ sessionId, onBack }: Props) {
  const { data: session, isLoading } = useScheduledSession(sessionId);
  const [activeTab, setActiveTab] = useState<InnerTab>('details');

  if (isLoading) return <div className="p-4 text-muted text-sm">Loading…</div>;
  if (!session) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-700 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors mb-2"
        >
          <ArrowLeft size={12} />
          Back to schedule
        </button>
        <h2 className="text-sm font-bold text-white truncate">{session.title}</h2>
        <p className="text-xs text-muted">{session.date}</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 border-b border-navy-700 -mb-[1px]">
          {([['details', 'Session Details'], ['players', 'Players'], ['evaluation', 'Evaluation']] as [InnerTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-xs py-1.5 px-3 transition-colors',
                activeTab === tab
                  ? 'text-white border-b-2 border-gold -mb-[2px]'
                  : 'text-muted hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'details' && <DetailsTab sessionId={sessionId} />}
        {activeTab === 'players' && <PlayersTab sessionId={sessionId} />}
        {activeTab === 'evaluation' && <EvaluationTab sessionId={sessionId} />}
      </div>
    </div>
  );
}
