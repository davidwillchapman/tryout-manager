import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { GroupForm } from './GroupForm';
import { PositionBreakdown } from './PositionBreakdown';
import { PositionBadge } from '../players/PositionBadge';
import { Badge } from '../ui/Badge';
import { useUpdateGroup, useDeleteGroup, useGroupBreakdown, useGroupPlayers, useReorderGroupUnassigned } from '../../api/groups';
import { useTeams } from '../../api/teams';
import { useReorderTeamPlayers } from '../../api/teams';
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

function DraggablePlayer({
  player,
  fromGroupId,
  rank,
  onReorder,
  teams,
}: {
  player: Player;
  fromGroupId: number;
  rank: number;
  onReorder: (draggedId: number, targetId: number, insertBefore: boolean) => void;
  teams: Array<{ id: number; name: string }>;
}) {
  const [insertPos, setInsertPos] = useState<'before' | 'after' | null>(null);
  const [sendToOpen, setSendToOpen] = useState(false);
  const [overlayPos, setOverlayPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const arrowRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);
  const assignTeam = useAssignPlayerTeam();

  useEffect(() => {
    if (!sendToOpen) return;
    const close = () => setSendToOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [sendToOpen]);

  useEffect(() => {
    if (!sendToOpen || !overlayRef.current || !triggerRectRef.current) return;
    const rect = triggerRectRef.current;
    const overlayHeight = overlayRef.current.offsetHeight;
    const overlayWidth = overlayRef.current.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom - 4;
    const clampedLeft = Math.min(rect.left, window.innerWidth - overlayWidth - 8);
    if (overlayHeight > spaceBelow) {
      setOverlayPos({ bottom: window.innerHeight - rect.top + 4, top: undefined, left: clampedLeft });
    } else {
      setOverlayPos((prev) => prev ? { ...prev, left: clampedLeft } : prev);
    }
  }, [sendToOpen]);

  const openSendTo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sendToOpen) { setSendToOpen(false); return; }
    const rect = arrowRef.current?.getBoundingClientRect();
    if (rect) {
      triggerRectRef.current = rect;
      setOverlayPos({ top: rect.bottom + 4, bottom: undefined, left: rect.left });
    }
    setSendToOpen(true);
  };

  const readPayload = (e: React.DragEvent): PlayerDragPayload | null => {
    const raw = e.dataTransfer.getData(PLAYER_DRAG_MIME);
    if (!raw) return null;
    try { return JSON.parse(raw) as PlayerDragPayload; } catch { return null; }
  };

  return (
    <>
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
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(PLAYER_DRAG_MIME)) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          setInsertPos(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setInsertPos(null);
        }}
        onDrop={(e) => {
          const pos = insertPos;
          setInsertPos(null);
          const payload = readPayload(e);
          if (!payload) return;
          if (payload.fromTeamId === player.team_id && payload.playerId !== player.id) {
            e.preventDefault();
            e.stopPropagation();
            onReorder(payload.playerId, player.id, pos === 'before');
          }
          // cross-team drop: let event bubble to TeamSection
        }}
        className={`flex items-center gap-2 px-2 py-1.5 cursor-grab active:cursor-grabbing hover:bg-navy-700/60 transition-colors border-t border-b border-transparent ${
          insertPos === 'before' ? 'border-t-gold' : insertPos === 'after' ? 'border-b-gold' : ''
        }`}
        title="Drag to reorder or move to another team"
      >
        <button
          ref={arrowRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={openSendTo}
          className="text-muted hover:text-white shrink-0 p-0.5 rounded hover:bg-navy-600 transition-colors"
          title="Send to team"
        >
          <ChevronRight size={12} />
        </button>
        <span className="text-xs text-muted w-5 text-right shrink-0 tabular-nums">{rank}</span>
        <GripVertical size={12} className="text-muted shrink-0" />
        <span className="text-sm text-white truncate">{player.name}</span>
        {(player.prior_team || player.prior_team_division) && (
          <span className="text-xs text-muted/60 italic truncate shrink min-w-0">
            {[player.prior_team, player.prior_team_division].filter(Boolean).join(' · ')}
          </span>
        )}
        <span className="flex-1" />
        <PositionBadge position={player.primary_position} />
        {player.secondary_position && <PositionBadge position={player.secondary_position} muted />}
      </div>

      {sendToOpen && overlayPos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setSendToOpen(false)} />
          <div
            ref={overlayRef}
            className="fixed z-50 bg-navy-800 border border-navy-600 rounded shadow-lg py-1 min-w-36"
            style={{ top: overlayPos.top, bottom: overlayPos.bottom, left: overlayPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted px-3 pt-1 pb-1.5 uppercase tracking-wider border-b border-navy-700">Send to</p>
            {teams.map((team) => (
              <button
                key={team.id}
                disabled={player.team_id === team.id}
                onClick={() => {
                  assignTeam.mutate({ id: player.id, team_id: team.id });
                  setSendToOpen(false);
                }}
                className="w-full text-left text-sm px-3 py-1.5 hover:bg-navy-700 text-white disabled:text-muted disabled:cursor-default transition-colors"
              >
                {team.name}
              </button>
            ))}
            {player.team_id !== null && (
              <button
                onClick={() => {
                  assignTeam.mutate({ id: player.id, team_id: null });
                  setSendToOpen(false);
                }}
                className="w-full text-left text-sm px-3 py-1.5 hover:bg-navy-700 text-muted hover:text-white transition-colors border-t border-navy-700 mt-1"
              >
                Unassigned
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// Accepts drops from players in the same group. For same-team drops (append to end),
// pass onSameTeamDrop. For cross-team drops, assigns the player to targetTeamId.
function usePlayerDropZone(
  groupId: number,
  targetTeamId: number | null,
  onSameTeamDrop?: (playerId: number) => void,
) {
  const [isOver, setIsOver] = useState(false);
  const assignTeam = useAssignPlayerTeam();

  const readPayload = (e: React.DragEvent): PlayerDragPayload | null => {
    const raw = e.dataTransfer.getData(PLAYER_DRAG_MIME);
    if (!raw) return null;
    try { return JSON.parse(raw) as PlayerDragPayload; } catch { return null; }
  };

  return {
    isOver,
    dropHandlers: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(PLAYER_DRAG_MIME)) return;
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
        if (!payload || payload.fromGroupId !== groupId) return;
        e.preventDefault();
        e.stopPropagation();
        if (payload.fromTeamId === targetTeamId) {
          // Same-team drop on section header → append to end
          onSameTeamDrop?.(payload.playerId);
        } else {
          assignTeam.mutate({ id: payload.playerId, team_id: targetTeamId });
        }
      },
    },
  };
}

function TeamSection({
  teamId,
  teamName,
  players,
  groupId,
  teams,
}: {
  teamId: number;
  teamName: string;
  players: Player[];
  groupId: number;
  teams: Array<{ id: number; name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const teamPlayers = players.filter((p) => p.team_id === teamId);
  const reorder = useReorderTeamPlayers();

  const handleReorder = (draggedId: number, targetId: number, insertBefore: boolean) => {
    const ids = teamPlayers.map((p) => p.id).filter((id) => id !== draggedId);
    if (targetId === -1) {
      ids.push(draggedId);
    } else {
      const targetIdx = ids.indexOf(targetId);
      ids.splice(insertBefore ? targetIdx : targetIdx + 1, 0, draggedId);
    }
    reorder.mutate({ teamId, playerIds: ids });
  };

  const { isOver, dropHandlers } = usePlayerDropZone(groupId, teamId, (playerId) =>
    handleReorder(playerId, -1, false)
  );

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
            teamPlayers.map((p, i) => (
              <DraggablePlayer
                key={p.id}
                player={p}
                fromGroupId={groupId}
                rank={i + 1}
                onReorder={handleReorder}
                teams={teams}
              />
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
  const reorderUnassigned = useReorderGroupUnassigned();

  const handleUnassignedReorder = (draggedId: number, targetId: number, insertBefore: boolean) => {
    const ids = unassignedPlayers.map((p) => p.id).filter((id) => id !== draggedId);
    if (targetId === -1) {
      ids.push(draggedId);
    } else {
      const targetIdx = ids.indexOf(targetId);
      ids.splice(insertBefore ? targetIdx : targetIdx + 1, 0, draggedId);
    }
    reorderUnassigned.mutate({ groupId: group.id, playerIds: ids });
  };

  const unassignedDrop = usePlayerDropZone(group.id, null, (playerId) =>
    handleUnassignedReorder(playerId, -1, false)
  );

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
                    unassignedPlayers.map((p, i) => (
                      <DraggablePlayer
                        key={p.id}
                        player={p}
                        fromGroupId={group.id}
                        rank={i + 1}
                        onReorder={handleUnassignedReorder}
                        teams={teams}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 ? (
            teams.map((team) => (
              <TeamSection key={team.id} teamId={team.id} teamName={team.name} players={allPlayers} groupId={group.id} teams={teams} />
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
