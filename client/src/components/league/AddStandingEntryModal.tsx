import { useState } from 'react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { LeagueStanding } from '../../types';

type StandingInput = {
  team_name: string;
  points: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  goals_for: number;
  goals_against: number;
  finish_place?: number | null;
};

interface AddStandingEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LeagueStanding;
  onSubmit: (data: StandingInput) => void;
  isLoading?: boolean;
}

const EMPTY: StandingInput = {
  team_name: '',
  points: 0,
  games_played: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  goals_for: 0,
  goals_against: 0,
  finish_place: null,
};

function toInput(s: LeagueStanding): StandingInput {
  return {
    team_name: s.team_name,
    points: s.points,
    games_played: s.games_played,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
    goals_for: s.goals_for,
    goals_against: s.goals_against,
    finish_place: s.finish_place,
  };
}

export function AddStandingEntryModal({ open, onOpenChange, initial, onSubmit, isLoading }: AddStandingEntryModalProps) {
  const [form, setForm] = useState<StandingInput>(initial ? toInput(initial) : EMPTY);

  const set = <K extends keyof StandingInput>(key: K, value: StandingInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setNum = (key: keyof StandingInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, e.target.value === '' ? 0 : parseInt(e.target.value, 10) as StandingInput[typeof key]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const title = initial ? 'Edit Team Entry' : 'Add Team Entry';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !initial) setForm(EMPTY); onOpenChange(v); }}>
      <DialogContent title={title}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Team Name *</label>
            <Input
              value={form.team_name}
              onChange={(e) => set('team_name', e.target.value)}
              placeholder="e.g. Portland FC"
              required
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-muted mb-1">Pts</label>
              <Input type="number" min={0} value={form.points} onChange={setNum('points')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">GP</label>
              <Input type="number" min={0} value={form.games_played} onChange={setNum('games_played')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">W</label>
              <Input type="number" min={0} value={form.wins} onChange={setNum('wins')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">L</label>
              <Input type="number" min={0} value={form.losses} onChange={setNum('losses')} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-muted mb-1">T</label>
              <Input type="number" min={0} value={form.ties} onChange={setNum('ties')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">GF</label>
              <Input type="number" min={0} value={form.goals_for} onChange={setNum('goals_for')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">GA</label>
              <Input type="number" min={0} value={form.goals_against} onChange={setNum('goals_against')} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Rank</label>
              <Input
                type="number"
                min={1}
                value={form.finish_place ?? ''}
                onChange={(e) => set('finish_place', e.target.value ? parseInt(e.target.value, 10) : null)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !form.team_name}>
              {isLoading ? 'Saving...' : initial ? 'Save Changes' : 'Add Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
