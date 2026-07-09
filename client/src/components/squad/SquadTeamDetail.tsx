import { useState } from 'react';
import { Pencil, Trash2, Check, X, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent } from '../ui/Dialog';
import { RosterTab } from './RosterTab';
import { DepthChartTab } from './DepthChartTab';
import { FormationsTab } from './FormationsTab';
import { PeriodizationPlanTab } from './PeriodizationPlanTab';
import { TrainingScheduleTab } from './TrainingScheduleTab';
import {
  useSquadTeam,
  useUpdateSquadTeam,
  useToggleSquadTeamStatus,
  useDeleteSquadTeam,
  useCloneSquadTeam,
} from '../../api/squad';
import { cn } from '../../lib/utils';

type Tab = 'roster' | 'depth-chart' | 'formations' | 'periodization' | 'schedule';

interface Props {
  teamId: number;
  onDeleted: () => void;
  onCloned?: (newTeamId: number) => void;
}

interface EditFormProps {
  teamId: number;
  onClose: () => void;
}

function EditTeamDialog({ teamId, onClose }: EditFormProps) {
  const { data: team } = useSquadTeam(teamId);
  const update = useUpdateSquadTeam();
  const [name, setName] = useState(team?.name ?? '');
  const [desc, setDesc] = useState(team?.description ?? '');
  const [season, setSeason] = useState(team?.season_label ?? '');

  if (!team) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    update.mutate(
      { id: teamId, name: name.trim(), description: desc || null, season_label: season || null },
      { onSuccess: onClose }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-muted mb-1">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Description</label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Season Label</label>
        <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. Spring 2025" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={!name.trim() || update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

export function SquadTeamDetail({ teamId, onDeleted, onCloned }: Props) {
  const { data: team } = useSquadTeam(teamId);
  const toggleStatus = useToggleSquadTeamStatus();
  const deleteTeam = useDeleteSquadTeam();
  const cloneTeam = useCloneSquadTeam();
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!team) {
    return <div className="flex items-center justify-center h-full text-muted text-sm">Loading…</div>;
  }

  function handleDelete() {
    deleteTeam.mutate(teamId, { onSuccess: onDeleted });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-700 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">{team.name}</h2>
            {team.season_label && <p className="text-xs text-muted">{team.season_label}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                team.is_active ? 'bg-emerald-900/60 text-emerald-400' : 'bg-navy-700 text-muted'
              )}
            >
              {team.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => toggleStatus.mutate(teamId)}
              className="text-xs text-muted hover:text-white border border-navy-600 px-2 py-0.5 rounded transition-colors"
            >
              {team.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => cloneTeam.mutate(teamId, { onSuccess: (t) => onCloned?.(t.id) })}
              disabled={cloneTeam.isPending}
              className="text-muted hover:text-white p-1 rounded transition-colors disabled:opacity-50"
              title="Clone team"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="text-muted hover:text-white p-1 rounded transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} disabled={deleteTeam.isPending} className="text-red-400 hover:text-red-300 p-1">
                  <Check size={14} />
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-muted hover:text-white p-1">
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-muted hover:text-red-400 p-1 rounded transition-colors"
                title="Delete team"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 border-b border-navy-700 -mb-[1px]">
          {([['roster', 'Roster'], ['depth-chart', 'Depth Chart'], ['formations', 'Formations'], ['periodization', 'Periodization Plan'], ['schedule', 'Training Schedule']] as [Tab, string][]).map(([tab, label]) => (
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
      <div className="flex-1 overflow-hidden">
        {activeTab === 'roster' && <RosterTab teamId={teamId} teamName={team.name} />}
        {activeTab === 'depth-chart' && <DepthChartTab teamId={teamId} />}
        {activeTab === 'formations' && <FormationsTab teamId={teamId} />}
        {activeTab === 'periodization' && <PeriodizationPlanTab teamId={teamId} />}
        {activeTab === 'schedule' && <TrainingScheduleTab teamId={teamId} />}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent title="Edit Team">
          <EditTeamDialog teamId={teamId} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
