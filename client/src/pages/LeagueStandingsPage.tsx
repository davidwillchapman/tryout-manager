import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StandingsTable } from '../components/league/StandingsTable';
import { AddStandingEntryModal } from '../components/league/AddStandingEntryModal';
import { useLeagueSeason, useLeagueDivision, useLeagueStandings, useCreateLeagueStanding } from '../api/leagueResults';

export function LeagueStandingsPage() {
  const { seasonId, divisionId } = useParams<{ seasonId: string; divisionId: string }>();
  const navigate = useNavigate();
  const sId = Number(seasonId);
  const dId = Number(divisionId);

  const { data: season } = useLeagueSeason(sId);
  const { data: division, isLoading: divLoading } = useLeagueDivision(dId);
  const { data: standings = [], isLoading: standingsLoading } = useLeagueStandings(dId);
  const createStanding = useCreateLeagueStanding(dId);

  const [addOpen, setAddOpen] = useState(false);

  if (divLoading) {
    return <div className="p-6 text-muted text-sm">Loading...</div>;
  }

  if (!division) {
    return <div className="p-6 text-muted text-sm">Division not found.</div>;
  }

  return (
    <div className="p-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted mb-2">
            <button
              onClick={() => navigate('/league-results')}
              className="hover:text-white transition-colors"
            >
              League Results
            </button>
            <ChevronRight size={12} />
            <button
              onClick={() => navigate(`/league-results/${sId}`)}
              className="hover:text-white transition-colors"
            >
              {season?.name ?? `Season ${sId}`}
            </button>
            <ChevronRight size={12} />
            <span className="text-white">{division.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{division.name}</h1>
          <p className="text-sm text-muted mt-0.5">
            {[division.gender, division.age_group, division.division].filter(Boolean).join(' · ')}
            {standings.length > 0 && ` · ${standings.length} teams`}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Team
        </Button>
      </div>

      {standingsLoading ? (
        <div className="text-muted text-sm">Loading standings...</div>
      ) : (
        <div className="bg-navy-800 rounded-lg border border-navy-600 p-4">
          <StandingsTable standings={standings} divisionId={dId} />
        </div>
      )}

      <AddStandingEntryModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(data) => createStanding.mutate(data, { onSuccess: () => setAddOpen(false) })}
        isLoading={createStanding.isPending}
      />
    </div>
  );
}
