import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { GroupForm } from './GroupForm';
import { PositionBreakdown } from './PositionBreakdown';
import { PositionBadge } from '../players/PositionBadge';
import { Badge } from '../ui/Badge';
import { useUpdateGroup, useDeleteGroup, useGroupBreakdown, useGroupPlayers } from '../../api/groups';
import { useTeams } from '../../api/teams';
import type { Group, Player } from '../../types';

interface GroupCardProps {
  group: Group;
}

function TeamSection({ teamId, teamName, players }: { teamId: number; teamName: string; players: Player[] }) {
  const [expanded, setExpanded] = useState(false);
  const teamPlayers = players.filter((p) => p.team_id === teamId);

  return (
    <div className="border border-navy-600 rounded">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-navy-700 rounded transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-medium">{teamName}</span>
        <Badge className="ml-auto text-muted bg-navy-700">{teamPlayers.length}</Badge>
      </button>
      {expanded && (
        <div className="divide-y divide-navy-700">
          {teamPlayers.length === 0 ? (
            <p className="text-xs text-muted italic px-3 pb-2">No players assigned</p>
          ) : (
            teamPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm text-white flex-1 truncate">{p.name}</span>
                <PositionBadge position={p.primary_position} />
                {p.secondary_position && <PositionBadge position={p.secondary_position} muted />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function GroupCard({ group }: GroupCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const { data: breakdown } = useGroupBreakdown(group.id);
  const { data: allPlayers = [] } = useGroupPlayers(group.id);
  const { data: teams = [] } = useTeams(group.id);

  const unassignedPlayers = allPlayers.filter((p) => p.team_id === null);

  return (
    <>
      <div className="bg-navy-800 rounded-lg border border-navy-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white">{group.name}</h3>
            {group.description && <p className="text-xs text-muted mt-0.5">{group.description}</p>}
            <p className="text-xs text-muted mt-1">
              {allPlayers.length} player{allPlayers.length !== 1 ? 's' : ''}
              {' · '}
              {teams.length} team{teams.length !== 1 ? 's' : ''}
            </p>
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

        <div className="flex flex-col gap-2">
          {/* Unassigned players (in group, no team) */}
          {unassignedPlayers.length > 0 && (
            <div className="border border-navy-600 rounded border-dashed">
              <button
                onClick={() => setShowUnassigned(!showUnassigned)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-white hover:bg-navy-700 rounded transition-colors"
              >
                {showUnassigned ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>Unassigned</span>
                <Badge className="ml-auto text-muted bg-navy-700">{unassignedPlayers.length}</Badge>
              </button>
              {showUnassigned && (
                <div className="divide-y divide-navy-700">
                  {unassignedPlayers.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-sm text-white flex-1 truncate">{p.name}</span>
                      <PositionBadge position={p.primary_position} />
                      {p.secondary_position && <PositionBadge position={p.secondary_position} muted />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 ? (
            teams.map((team) => (
              <TeamSection key={team.id} teamId={team.id} teamName={team.name} players={allPlayers} />
            ))
          ) : unassignedPlayers.length === 0 ? (
            <p className="text-xs text-muted italic">No teams or players in this group yet</p>
          ) : null}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit Group">
          <GroupForm
            initial={group}
            onSubmit={(data) => updateGroup.mutate({ id: group.id, ...data }, { onSuccess: () => setEditOpen(false) })}
            onCancel={() => setEditOpen(false)}
            isLoading={updateGroup.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent title="Delete Group" description={`Delete "${group.name}" and all its teams? Players will be unassigned.`}>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => deleteGroup.mutate(group.id, { onSuccess: () => setDeleteOpen(false) })}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
