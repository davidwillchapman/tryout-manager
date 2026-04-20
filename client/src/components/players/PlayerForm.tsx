import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectItem, SelectGroup } from '../ui/Select';
import { POSITIONS, POSITION_GROUPS } from '../../lib/positions';
import { useTeams } from '../../api/teams';
import { useGroups } from '../../api/groups';
import type { PlayerInput } from '../../api/players';
import type { Player } from '../../types';

interface PlayerFormProps {
  initial?: Player;
  onSubmit: (data: PlayerInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EMPTY: PlayerInput = {
  name: '',
  primary_position: '',
  secondary_position: null,
  prior_team: null,
  prior_team_division: null,
  notes: null,
  group_id: null,
  team_id: null,
};

function toInput(p: Player): PlayerInput {
  return {
    name: p.name,
    primary_position: p.primary_position,
    secondary_position: p.secondary_position,
    prior_team: p.prior_team,
    prior_team_division: p.prior_team_division,
    notes: p.notes,
    group_id: p.group_id,
    team_id: p.team_id,
  };
}

export function PlayerForm({ initial, onSubmit, onCancel, isLoading }: PlayerFormProps) {
  const [form, setForm] = useState<PlayerInput>(initial ? toInput(initial) : EMPTY);
  const { data: teams = [] } = useTeams();
  const { data: groups = [] } = useGroups();

  const set = <K extends keyof PlayerInput>(key: K, value: PlayerInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleGroupChange = (value: string) => {
    const newGroupId = value ? parseInt(value) : null;
    // Clear team if it doesn't belong to the new group
    const currentTeam = teams.find((t) => t.id === form.team_id);
    const teamStillValid = currentTeam && currentTeam.group_id === newGroupId;
    setForm((f) => ({ ...f, group_id: newGroupId, team_id: teamStillValid ? f.team_id : null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  // Filter teams to the selected group; if no group selected, show all teams
  const availableTeams = form.group_id
    ? teams.filter((t) => t.group_id === form.group_id)
    : teams;

  const groupedTeams = form.group_id
    ? [{ group: groups.find((g) => g.id === form.group_id)!, teams: availableTeams }].filter((g) => g.group)
    : groups.map((g) => ({ group: g, teams: teams.filter((t) => t.group_id === g.id) })).filter((g) => g.teams.length > 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1">Name *</label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Player name"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Primary Position *</label>
          <Select
            value={form.primary_position}
            onValueChange={(v) => set('primary_position', v)}
            placeholder="Select position"
          >
            {POSITION_GROUPS.map((group) => (
              <SelectGroup key={group} label={group}>
                {POSITIONS.filter((p) => p.group === group).map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.value} – {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Secondary Position</label>
          <Select
            value={form.secondary_position ?? ''}
            onValueChange={(v) => set('secondary_position', v || null)}
            placeholder="None"
          >
            <SelectItem value="">None</SelectItem>
            {POSITION_GROUPS.map((group) => (
              <SelectGroup key={group} label={group}>
                {POSITIONS.filter((p) => p.group === group).map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.value} – {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Prior Team</label>
          <Input
            value={form.prior_team ?? ''}
            onChange={(e) => set('prior_team', e.target.value || null)}
            placeholder="Previous club"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Prior Team Division</label>
          <Input
            value={form.prior_team_division ?? ''}
            onChange={(e) => set('prior_team_division', e.target.value || null)}
            placeholder="e.g. D1, D2, Premier"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Group</label>
          <Select
            value={form.group_id?.toString() ?? ''}
            onValueChange={handleGroupChange}
            placeholder="Unassigned"
          >
            <SelectItem value="">Unassigned</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Team</label>
          <Select
            value={form.team_id?.toString() ?? ''}
            onValueChange={(v) => set('team_id', v ? parseInt(v) : null)}
            placeholder="Unassigned"
            disabled={availableTeams.length === 0}
          >
            <SelectItem value="">Unassigned</SelectItem>
            {groupedTeams.map(({ group, teams: gTeams }) => (
              <SelectGroup key={group.id} label={group.name}>
                {gTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </Select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1">Notes</label>
          <Textarea
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || null)}
            placeholder="Free text notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !form.name || !form.primary_position}>
          {isLoading ? 'Saving...' : initial ? 'Save Changes' : 'Add Player'}
        </Button>
      </div>
    </form>
  );
}
