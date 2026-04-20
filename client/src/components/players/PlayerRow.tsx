import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PositionBadge } from './PositionBadge';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { useDeletePlayer } from '../../api/players';
import type { Player } from '../../types';

interface PlayerRowProps {
  player: Player;
  onEdit: (player: Player) => void;
}

export function PlayerRow({ player, onEdit }: PlayerRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deletePlayer = useDeletePlayer();

  return (
    <>
      <tr className="border-b border-navy-700 hover:bg-navy-800/50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-white">{player.name}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <PositionBadge position={player.primary_position} />
            {player.secondary_position && (
              <PositionBadge position={player.secondary_position} muted />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted">
          {player.prior_team ? (
            <span>
              {player.prior_team}
              {player.prior_team_division && (
                <span className="ml-1 text-xs opacity-70">({player.prior_team_division})</span>
              )}
            </span>
          ) : (
            <span className="text-navy-600">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {player.group_name && (
              <span className="text-xs text-muted">{player.group_name}</span>
            )}
            {player.team_name ? (
              <Badge className="text-gold bg-navy-700 w-fit">{player.team_name}</Badge>
            ) : player.group_name ? (
              <span className="text-xs text-navy-600 italic">No team</span>
            ) : (
              <span className="text-xs text-navy-600">Unassigned</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted max-w-[200px] truncate">
          {player.notes ?? <span className="text-navy-600">—</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(player)} title="Edit">
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} title="Delete" className="hover:text-red-400">
              <Trash2 size={14} />
            </Button>
          </div>
        </td>
      </tr>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="Delete Player" description={`Remove "${player.name}" from the roster?`}>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => deletePlayer.mutate(player.id, { onSuccess: () => setConfirmDelete(false) })}
              disabled={deletePlayer.isPending}
            >
              {deletePlayer.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
