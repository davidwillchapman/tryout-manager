import { useState } from 'react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAddSquadPlayer } from '../../api/squad';
import { POSITIONS } from '../../lib/positions';
import type { SquadPlayer } from '../../types';

interface Props {
  open: boolean;
  teamId: number;
  onClose: () => void;
}

export function AddSquadPlayerModal({ open, teamId, onClose }: Props) {
  const [name, setName] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [status, setStatus] = useState<SquadPlayer['status']>('active');
  const addPlayer = useAddSquadPlayer(teamId);

  function reset() {
    setName('');
    setPrimaryPosition('');
    setSecondaryPosition('');
    setJerseyNumber('');
    setStatus('active');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addPlayer.mutate(
      {
        name: name.trim(),
        primary_position: primaryPosition || null,
        secondary_position: secondaryPosition || null,
        jersey_number: jerseyNumber || null,
        status,
      },
      { onSuccess: handleClose }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent title="Add Player">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Primary Position</label>
              <select
                value={primaryPosition}
                onChange={(e) => setPrimaryPosition(e.target.value)}
                className="w-full h-9 rounded border border-navy-600 bg-navy-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">— None —</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Secondary Position</label>
              <select
                value={secondaryPosition}
                onChange={(e) => setSecondaryPosition(e.target.value)}
                className="w-full h-9 rounded border border-navy-600 bg-navy-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">— None —</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Jersey #</label>
              <Input value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SquadPlayer['status'])}
                className="w-full h-9 rounded border border-navy-600 bg-navy-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="injured">Injured</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!name.trim() || addPlayer.isPending}>
              {addPlayer.isPending ? 'Adding…' : 'Add Player'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
