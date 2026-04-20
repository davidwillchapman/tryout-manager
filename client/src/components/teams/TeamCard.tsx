import { useState } from 'react';
import { Pencil, Trash2, UserMinus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { TeamForm } from './TeamForm';
import { PositionBreakdown } from '../groups/PositionBreakdown';
import { PositionBadge } from '../players/PositionBadge';
import { useUpdateTeam, useDeleteTeam, useTeamPlayers, useTeamBreakdown } from '../../api/teams';
import { useAssignPlayerTeam } from '../../api/players';
import type { Team } from '../../types';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const assignTeam = useAssignPlayerTeam();
  const { data: players = [] } = useTeamPlayers(team.id);
  const { data: breakdown } = useTeamBreakdown(team.id);

  return (
    <>
      <div className="bg-navy-800 rounded-lg border border-navy-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white">{team.name}</h3>
            {team.group_name && (
              <p className="text-xs text-muted mt-0.5">Group: {team.group_name}</p>
            )}
            {team.description && <p className="text-xs text-muted mt-0.5">{team.description}</p>}
            <p className="text-xs text-muted mt-1">{players.length} player{players.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} title="Edit">
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} title="Delete" className="hover:text-red-400">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {breakdown && (
          <div className="mb-4 p-3 bg-navy-900 rounded border border-navy-600">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Positional Breakdown</p>
            <PositionBreakdown data={breakdown} />
          </div>
        )}

        {players.length > 0 ? (
          <div className="divide-y divide-navy-700 border border-navy-600 rounded">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                <span className="text-sm text-white flex-1 truncate">{p.name}</span>
                <PositionBadge position={p.primary_position} />
                {p.secondary_position && <PositionBadge position={p.secondary_position} muted />}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remove from team"
                  className="hover:text-red-400 shrink-0"
                  onClick={() => assignTeam.mutate({ id: p.id, team_id: null })}
                >
                  <UserMinus size={12} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">No players assigned to this team</p>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit Team">
          <TeamForm
            initial={team}
            onSubmit={(data) => updateTeam.mutate({ id: team.id, ...data }, { onSuccess: () => setEditOpen(false) })}
            onCancel={() => setEditOpen(false)}
            isLoading={updateTeam.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent title="Delete Team" description={`Delete "${team.name}"? Players will be unassigned.`}>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => deleteTeam.mutate(team.id, { onSuccess: () => setDeleteOpen(false) })}
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? 'Deleting...' : 'Delete Team'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
