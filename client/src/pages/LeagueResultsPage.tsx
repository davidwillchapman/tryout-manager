import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SeasonCard } from '../components/league/SeasonCard';
import { AddSeasonModal } from '../components/league/AddSeasonModal';
import { useLeagueSeasons, useCreateLeagueSeason, useImportLeagueSeason } from '../api/leagueResults';
import type { ImportSummary } from '../types';

export function LeagueResultsPage() {
  const { data: seasons = [], isLoading } = useLeagueSeasons();
  const createSeason = useCreateLeagueSeason();
  const importSeason = useImportLeagueSeason();

  const [modalOpen, setModalOpen] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importResults, setImportResults] = useState<Record<number, ImportSummary>>({});

  const handleCreate = (data: { name: string; year: number; description?: string | null; source_url?: string | null }) => {
    createSeason.mutate(data, {
      onSuccess: (season) => {
        setModalOpen(false);
        if (season.source_url) {
          setImportingId(season.id);
          importSeason.mutate(
            { seasonId: season.id },
            {
              onSuccess: (result) => {
                setImportingId(null);
                setImportResults((prev) => ({ ...prev, [season.id]: result }));
              },
              onError: () => setImportingId(null),
            }
          );
        }
      },
    });
  };

  const handleReImport = (seasonId: number) => {
    setImportingId(seasonId);
    setImportResults((prev) => {
      const next = { ...prev };
      delete next[seasonId];
      return next;
    });
    importSeason.mutate(
      { seasonId },
      {
        onSuccess: (result) => {
          setImportingId(null);
          setImportResults((prev) => ({ ...prev, [seasonId]: result }));
        },
        onError: () => setImportingId(null),
      }
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">League Results</h1>
          <p className="text-sm text-muted mt-0.5">Past season standings by division</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Season
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : seasons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">No seasons yet. Add a season to start importing league results.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {seasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              isImporting={importingId === season.id}
              importResult={importResults[season.id]}
              onReImport={handleReImport}
            />
          ))}
        </div>
      )}

      <AddSeasonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleCreate}
        isLoading={createSeason.isPending}
      />
    </div>
  );
}
