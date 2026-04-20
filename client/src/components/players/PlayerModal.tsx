import { Dialog, DialogContent } from '../ui/Dialog';
import { PlayerForm } from './PlayerForm';
import { useCreatePlayer, useUpdatePlayer, type PlayerInput } from '../../api/players';
import type { Player } from '../../types';

interface PlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player;
}

export function PlayerModal({ open, onOpenChange, player }: PlayerModalProps) {
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();

  const isEditing = !!player;
  const isPending = createPlayer.isPending || updatePlayer.isPending;

  const handleSubmit = (data: PlayerInput) => {
    if (isEditing) {
      updatePlayer.mutate({ id: player.id, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPlayer.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditing ? 'Edit Player' : 'Add Player'}>
        <PlayerForm
          initial={player}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
