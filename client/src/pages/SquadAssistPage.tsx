import { useState } from 'react';
import { Users, Plus, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { SquadTeamList } from '../components/squad/SquadTeamList';
import { SquadTeamDetail } from '../components/squad/SquadTeamDetail';
import { ImportTeamModal } from '../components/squad/ImportTeamModal';
import { useSquadTeams, useCreateSquadTeam } from '../api/squad';
type Filter = 'all' | 'active' | 'inactive';

export function SquadAssistPage() {
  const { data: teams = [] } = useSquadTeams();
  const createTeam = useCreateSquadTeam();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSeason, setNewSeason] = useState('');

  function handleNewTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createTeam.mutate(
      { name: newName.trim(), season_label: newSeason || null },
      {
        onSuccess: (t) => {
          setSelectedTeamId(t.id);
          setNewName('');
          setNewSeason('');
          setNewOpen(false);
        },
      }
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden bg-navy-900">
        <div className="px-4 py-4 border-b border-navy-700 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-gold" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Squad Assist</h1>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={12} /> Import
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setNewOpen(true)}
            >
              <Plus size={12} /> New Team
            </Button>
          </div>
        </div>

        <SquadTeamList
          teams={teams}
          selectedId={selectedTeamId}
          filter={filter}
          onSelect={setSelectedTeamId}
          onFilterChange={setFilter}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden bg-navy-900">
        {selectedTeamId ? (
          <SquadTeamDetail
            key={selectedTeamId}
            teamId={selectedTeamId}
            onDeleted={() => setSelectedTeamId(null)}
            onCloned={(id) => setSelectedTeamId(id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Users size={48} className="text-navy-700 mb-4" />
            <h2 className="text-white font-semibold mb-1">No Squad Selected</h2>
            <p className="text-muted text-sm">
              Import a team from the tryout manager, or create a new squad.
            </p>
          </div>
        )}
      </div>

      {/* Import dialog */}
      <ImportTeamModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(id) => { setSelectedTeamId(id); setImportOpen(false); }}
      />

      {/* New Team dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => !v && setNewOpen(false)}>
        <DialogContent title="New Squad Team">
          <form onSubmit={handleNewTeam} className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Team Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. U14 Boys" required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Season Label (optional)</label>
              <Input value={newSeason} onChange={(e) => setNewSeason(e.target.value)} placeholder="e.g. Fall 2025" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={!newName.trim() || createTeam.isPending}>
                {createTeam.isPending ? 'Creating…' : 'Create Team'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
