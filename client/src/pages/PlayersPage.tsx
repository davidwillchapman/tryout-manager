import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectItem } from '../components/ui/Select';
import { PlayerRow } from '../components/players/PlayerRow';
import { PlayerModal } from '../components/players/PlayerModal';
import { usePlayers } from '../api/players';
import { useGroups } from '../api/groups';
import { useDebounce } from '../hooks/useDebounce';
import { POSITIONS } from '../lib/positions';
import type { Player } from '../types';

export function PlayersPage() {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();

  const debouncedSearch = useDebounce(search, 300);
  const { data: groups = [] } = useGroups();

  const { data: players = [], isLoading } = usePlayers({
    search: debouncedSearch || undefined,
    primary_position: positionFilter || undefined,
    group_id: groupFilter || undefined,
  });

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPlayer(undefined);
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-sm text-muted mt-0.5">{players.length} player{players.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus size={16} />
          Add Player
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="pl-8"
          />
        </div>
        <div className="w-44">
          <Select
            value={positionFilter}
            onValueChange={setPositionFilter}
            placeholder="All positions"
          >
            <SelectItem value="">All positions</SelectItem>
            {POSITIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.value} – {p.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={groupFilter}
            onValueChange={setGroupFilter}
            placeholder="All groups"
          >
            <SelectItem value="">All groups</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-navy-600 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading...</div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted text-sm">
              {search || positionFilter || groupFilter ? 'No players match your filters.' : 'No players yet. Add your first player to get started.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-600 bg-navy-900">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Prior Team</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerRow key={player.id} player={player} onEdit={handleEdit} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PlayerModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingPlayer(undefined); }}
        player={editingPlayer}
      />
    </div>
  );
}
