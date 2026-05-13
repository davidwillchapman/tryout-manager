import { useState } from 'react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useGroups, useGroupTeams } from '../../api/groups';
import { useImportSquadTeam } from '../../api/squad';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (id: number) => void;
}

export function ImportTeamModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [seasonLabel, setSeasonLabel] = useState('');

  const { data: groups = [] } = useGroups();
  const { data: teams = [] } = useGroupTeams(selectedGroupId ?? 0);
  const importTeam = useImportSquadTeam();

  function reset() {
    setStep(1);
    setSelectedGroupId(null);
    setSelectedTeamId(null);
    setSeasonLabel('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleGroupSelect(id: number) {
    setSelectedGroupId(id);
    setSelectedTeamId(null);
    setStep(2);
  }

  function handleImport() {
    if (!selectedTeamId) return;
    importTeam.mutate(
      { sourceTeamId: selectedTeamId, season_label: seasonLabel || null },
      {
        onSuccess: (team) => {
          onImported(team.id);
          handleClose();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent title="Import Team" className="max-w-md">
        {step === 1 ? (
          <>
            <p className="text-sm text-muted mb-3">Select a group to import a team from:</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">No groups found</p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGroupSelect(g.id)}
                    className="w-full text-left px-3 py-2 rounded text-sm text-white hover:bg-navy-700 transition-colors border border-navy-700 hover:border-navy-600"
                  >
                    <span className="font-medium">{g.name}</span>
                    {g.team_count !== undefined && (
                      <span className="text-muted ml-2 text-xs">{g.team_count} teams</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted hover:text-white mb-3 flex items-center gap-1"
            >
              ← Back to groups
            </button>
            <p className="text-sm text-muted mb-3">Select a team:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              {teams.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">No teams in this group</p>
              ) : (
                teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamId(t.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded text-sm transition-colors border',
                      selectedTeamId === t.id
                        ? 'bg-navy-600 border-gold text-white'
                        : 'border-navy-700 text-white hover:bg-navy-700 hover:border-navy-600'
                    )}
                  >
                    <span className="font-medium">{t.name}</span>
                    {t.player_count !== undefined && (
                      <span className="text-muted ml-2 text-xs">{t.player_count} players</span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1">Season Label (optional)</label>
              <Input
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                placeholder="e.g. Spring 2025"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                size="sm"
                disabled={!selectedTeamId || importTeam.isPending}
                onClick={handleImport}
              >
                {importTeam.isPending ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
