import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Trash2, Plus, Download, ChevronDown, ChevronRight, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent } from '../ui/Dialog';
import { ActivityForm } from '../activities/ActivityForm';
import { SessionForm } from './SessionForm';
import { AddActivityToSessionModal } from './AddActivityToSessionModal';
import {
  useSession,
  useUpdateSession,
  useDeleteSession,
  useRemoveActivityFromSession,
  useReorderSessionActivities,
  usePatchSessionActivity,
} from '../../api/sessions';
import { useUpdateActivity, useCloneActivity } from '../../api/activities';
import type { SessionActivity, GamePhase, Activity } from '../../types';
import { cn } from '../../lib/utils';

const PHASE_COLORS: Record<GamePhase, string> = {
  'Attacking': 'bg-green-900 text-green-300',
  'Attacking to Defending Transition': 'bg-yellow-900 text-yellow-300',
  'Defending': 'bg-red-900 text-red-300',
  'Defending to Attacking Transition': 'bg-blue-900 text-blue-300',
  'Other': 'bg-navy-700 text-white',
};

interface SessionDetailProps {
  sessionId: number;
  onDeleted: () => void;
}

export function SessionDetail({ sessionId, onDeleted }: SessionDetailProps) {
  const { data: session, isLoading } = useSession(sessionId);
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const removeActivity = useRemoveActivityFromSession();
  const reorder = useReorderSessionActivities();

  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SessionActivity | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [pendingActivityValues, setPendingActivityValues] = useState<Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'> | null>(null);

  if (isLoading) return <div className="p-6 text-muted text-sm">Loading…</div>;
  if (!session) return null;

  const phaseColor = PHASE_COLORS[session.game_phase] ?? 'bg-navy-700 text-white';

  const handleDelete = () => {
    if (confirm(`Delete "${session.title}"? This cannot be undone.`)) {
      deleteSession.mutate(session.id, { onSuccess: onDeleted });
    }
  };

  const handleRemoveActivity = (saId: number) => {
    removeActivity.mutate({ sessionId: session.id, saId });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const activities = [...session.activities].sort((a, b) => a.order_index - b.order_index);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= activities.length) return;
    const newOrder = activities.map((sa) => sa.id);
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    reorder.mutate({ sessionId: session.id, order: newOrder });
  };

  const handleActivityEditSubmit = (values: Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>) => {
    setPendingActivityValues(values);
    setSaveAsOpen(true);
  };

  const handleExport = () => {
    const sorted = [...session.activities].sort((a, b) => a.order_index - b.order_index);
    const subPrinciples = [session.sub_principle_1, session.sub_principle_2].filter(Boolean).join(', ');

    const lines: string[] = [
      `# ${session.title}`,
      '',
      `**Phase:** ${session.game_phase}`,
      `**Objective:** ${session.overall_objective}`,
      `**Main Principle:** ${session.main_principle}`,
      ...(subPrinciples ? [`**Sub Principles:** ${subPrinciples}`] : []),
      '',
      '---',
      '',
      '## Activities',
    ];

    sorted.forEach((sa, i) => {
      const a = sa.activity;
      lines.push('', `### ${i + 1}. ${a.title}`);
      const meta = [a.activity_type && `**Type:** ${a.activity_type}`, a.duration_minutes && `**Duration:** ${a.duration_minutes} min`].filter(Boolean).join(' | ');
      if (meta) lines.push(meta);
      if (a.summary) lines.push('', a.summary);
      if (a.description) lines.push('', '**Description**', a.description);
      if (a.field_setup) lines.push('', '**Field Setup**', a.field_setup);
      if (a.coaching_points) lines.push('', '**Coaching Points**', a.coaching_points);
      if (a.flexibility_notes) lines.push('', '**Flexibility Notes**', a.flexibility_notes);
      lines.push('', '---');
    });

    const markdown = lines.join('\n');
    const slug = session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...session.activities].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-navy-700 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={cn('text-xs', phaseColor)}>{session.game_phase}</Badge>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">{session.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setEditSessionOpen(true)}>
              <Edit2 size={13} /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExport}>
              <Download size={13} /> Export
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleDelete}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Metadata */}
        <div className="flex flex-col gap-3">
          <MetaField label="Overall Objective" value={session.overall_objective} />
          <MetaField label="Main Principle" value={session.main_principle} />
          {session.sub_principle_1 && <MetaField label="Sub Principle 1" value={session.sub_principle_1} />}
          {session.sub_principle_2 && <MetaField label="Sub Principle 2" value={session.sub_principle_2} />}
        </div>

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              Activities ({sorted.length}/6)
            </p>
            {sorted.length < 6 && (
              <Button size="sm" variant="ghost" onClick={() => setAddActivityOpen(true)}>
                <Plus size={12} /> Add Activity
              </Button>
            )}
          </div>

          {sorted.length === 0 ? (
            <p className="text-xs text-muted italic">No activities yet. Add up to 6.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((sa, index) => (
                <ActivityCard
                  key={sa.id}
                  sa={sa}
                  index={index}
                  total={sorted.length}
                  onRemove={() => handleRemoveActivity(sa.id)}
                  onMoveUp={() => handleMove(index, -1)}
                  onMoveDown={() => handleMove(index, 1)}
                  onEdit={() => setEditingActivity(sa)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit session dialog */}
      <Dialog open={editSessionOpen} onOpenChange={(v) => !v && setEditSessionOpen(false)}>
        <DialogContent title="Edit Session" className="max-w-lg">
          <SessionForm
            initialValues={session}
            onSubmit={(values) => {
              updateSession.mutate({ id: session.id, ...values }, { onSuccess: () => setEditSessionOpen(false) });
            }}
            isPending={updateSession.isPending}
            onCancel={() => setEditSessionOpen(false)}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Add activity modal */}
      <AddActivityToSessionModal
        sessionId={session.id}
        existingActivities={session.activities}
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
      />

      {/* Edit activity dialog */}
      {editingActivity && (
        <Dialog open={!!editingActivity} onOpenChange={(v) => { if (!v) { setEditingActivity(null); setSaveAsOpen(false); setPendingActivityValues(null); } }}>
          <DialogContent title={`Edit: ${editingActivity.activity.title}`} className="max-w-2xl">
            <ActivityForm
              initialValues={editingActivity.activity}
              onSubmit={handleActivityEditSubmit}
              isPending={false}
              onCancel={() => { setEditingActivity(null); setSaveAsOpen(false); setPendingActivityValues(null); }}
              submitLabel="Review Save Options"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Save-as dialog */}
      {editingActivity && saveAsOpen && pendingActivityValues && (
        <SaveAsDialog
          sessionId={session.id}
          sa={editingActivity}
          values={pendingActivityValues}
          onDone={() => { setEditingActivity(null); setSaveAsOpen(false); setPendingActivityValues(null); }}
          onCancel={() => setSaveAsOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-300">{value}</p>
    </div>
  );
}

interface ActivityCardProps {
  sa: SessionActivity;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
}

function ActivityCard({ sa, index, total, onRemove, onMoveUp, onMoveDown, onEdit }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const a = sa.activity;

  return (
    <div className="border border-navy-700 rounded bg-navy-800">
      {/* Collapsed header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2" onClick={() => setExpanded((v) => !v)}>
          <span className="text-xs text-muted shrink-0">{index + 1}.</span>
          <p className="text-sm font-medium text-white truncate cursor-pointer">{a.title}</p>
          {a.activity_type && <Badge className="text-xs shrink-0">{a.activity_type}</Badge>}
          {a.duration_minutes && <span className="text-xs text-muted shrink-0">{a.duration_minutes}m</span>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} className="text-muted hover:text-white disabled:opacity-30 p-0.5 transition-colors">
            <ArrowUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-muted hover:text-white disabled:opacity-30 p-0.5 transition-colors">
            <ArrowDown size={12} />
          </button>
          <button onClick={onEdit} className="text-muted hover:text-white p-0.5 transition-colors">
            <Edit2 size={12} />
          </button>
          <button onClick={onRemove} className="text-muted hover:text-red-400 p-0.5 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-navy-700 flex flex-col gap-3">
          {a.summary && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-gray-300">{a.summary}</p>
            </div>
          )}
          {a.description && (
            <ExpandedField label="Description">{a.description}</ExpandedField>
          )}
          {a.field_setup && (
            <ExpandedField label="Field Setup">{a.field_setup}</ExpandedField>
          )}
          {a.coaching_points && (
            <ExpandedField label="Coaching Points">{a.coaching_points}</ExpandedField>
          )}
          {a.flexibility_notes && (
            <ExpandedField label="Flexibility Notes">{a.flexibility_notes}</ExpandedField>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandedField({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
    </div>
  );
}

interface SaveAsDialogProps {
  sessionId: number;
  sa: SessionActivity;
  values: Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>;
  onDone: () => void;
  onCancel: () => void;
}

function SaveAsDialog({ sessionId, sa, values, onDone, onCancel }: SaveAsDialogProps) {
  const updateActivity = useUpdateActivity();
  const cloneActivity = useCloneActivity();
  const patchSa = usePatchSessionActivity();

  const handleUpdate = () => {
    updateActivity.mutate({ id: sa.activity.id, ...values }, { onSuccess: onDone });
  };

  const handleSaveAsNew = () => {
    cloneActivity.mutate(sa.activity.id, {
      onSuccess: (cloned) => {
        updateActivity.mutate({ id: cloned.id, ...values }, {
          onSuccess: () => {
            patchSa.mutate({ sessionId, saId: sa.id, activity_id: cloned.id }, { onSuccess: onDone });
          },
        });
      },
    });
  };

  const isPending = updateActivity.isPending || cloneActivity.isPending || patchSa.isPending;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent title="Save Changes">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-300">
            How would you like to save the changes to <strong className="text-white">{sa.activity.title}</strong>?
          </p>
          <p className="text-xs text-muted">
            Updating will affect this activity everywhere it is used.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleUpdate} disabled={isPending} className="w-full justify-center">
              Update "{sa.activity.title}"
            </Button>
            <Button onClick={handleSaveAsNew} disabled={isPending} variant="outline" className="w-full justify-center">
              Save as New Copy
            </Button>
            <Button onClick={onCancel} variant="ghost" className="w-full justify-center">
              Cancel
            </Button>
          </div>
          {(updateActivity.isError || cloneActivity.isError || patchSa.isError) && (
            <p className="text-xs text-red-400">
              {((updateActivity.error || cloneActivity.error || patchSa.error) as Error)?.message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
