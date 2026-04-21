import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { GroupForm } from './GroupForm';
import { PositionBreakdown } from './PositionBreakdown';
import { PositionBadge } from '../players/PositionBadge';
import { Badge } from '../ui/Badge';
import { useUpdateGroup, useDeleteGroup, useGroupBreakdown, useGroupPlayers } from '../../api/groups';
import { useTeams } from '../../api/teams';
import { useAssignPlayerTeam } from '../../api/players';
import type { Group, Player } from '../../types';

interface GroupCardProps {
  group: Group;
}

const PLAYER_DRAG_MIME = 'application/x-tryout-player';

interface PlayerDragPayload {
  playerId: number;
  fromGroupId: number;
  fromTeamId: number | null;
}

function DraggablePlayer({ player, fromGroupId }: { player: Player; fromGroupId: number }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: PlayerDragPayload = {
          playerId: player.id,
          fromGroupId,
          fromTeamId: player.team_id,
        };
        e.dataTransfer.setData(PLAYER_DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="flex items-center gap-2 px-3 py-1.5 cursor-grab active:cursor-grabbing hover:bg-navy-700/60 transition-colors"
      title="Drag to another team in this group"
    >
      <GripVertical size={12} className="text-muted shrink-0" />
      <span className="text-sm text-white flex-1 truncate">{player.name}</span>
      <PositionBadge position={player.primary_position} />
      {player.secondary_position && <PositionBadge position={player.secondary_position} muted />}
    </div>
  );
}

// Accepts drops from players in the same group whose current team_id differs from targetTeamId.
// targetTeamId === null means "unassigned" (clear team_id).
function usePlayerDropZone(groupId: number, targetTeamId: number | null) {
  const [isOver, setIsOver] = useState(false);
  const assignTeam = useAssignPlayerTeam();

  const readPayload = (e: React.DragEvent): PlayerDragPayload | null => {
    const raw = e.dataTransfer.getData(PLAYER_DRAG_MIME);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlayerDragPayload;
    } catch {
      return null;
    }
  };

  const accepts = (payload: PlayerDragPayload | null) =>
    payload != null && payload.fromGroupId === groupId && payload.fromTeamId !== targetTeamId;

  return {
    isOver,
    dropHandlers: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(PLAYER_DRAG_MIME)) return;
        // We can't read payload during dragover (browser hides data), so we optimistically
        // highlight any player drag. The drop handler enforces the real acceptance check.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isOver) setIsOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        setIsOver(false);
        const payload = readPayload(e);
        if (!accepts(payload)) return;
        e.preventDefault();
        e.stopPropagation();
        assignTeam.mutate({ id: payload!.playerId, team_id: targetTeamId });
      },
    },
  };
}

function TeamSection({
  teamId,
  teamName,
  players,
  groupId,
}: {
  teamId: number;
  teamName: string;
  players: Player[];
  groupId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const teamPlayers = players.filter((p) => p.team_id === teamId);
  const { isOver, dropHandlers } = usePlayerDropZone(groupId, teamId);

  return (
    <div
      {...dropHandlers}
      className={`border rounded transition-colors ${
        isOver ? 'border-gold ring-2 ring-gold/40 bg-navy-700/40' : 'border-navy-600'
      }`}
    >
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
              <DraggablePlayer key={p.id} player={p} fromGroupId={groupId} />
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
  const unassignedDrop = usePlayerDropZone(group.id, null);

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
          {/* Unassigned players (in group, no team). Always a drop target so you can
              drop a player here to clear their team assignment. */}
          {(unassignedPlayers.length > 0 || teams.length > 0) && (
            <div
              {...unassignedDrop.dropHandlers}
              className={`border rounded border-dashed transition-colors ${
                unassignedDrop.isOver
                  ? 'border-gold ring-2 ring-gold/40 bg-navy-700/40'
                  : 'border-navy-600'
              }`}
            >
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
                  {unassignedPlayers.length === 0 ? (
                    <p className="text-xs text-muted italic px-3 pb-2">
                      Drop a player here to remove their team assignment
                    </p>
                  ) : (
                    unassignedPlayers.map((p) => (
                      <DraggablePlayer key={p.id} player={p} fromGroupId={group.id} />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 ? (
            teams.map((team) => (
              <TeamSection key={team.id} teamId={team.id} teamName={team.name} players={allPlayers} groupId={group.id} />
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
