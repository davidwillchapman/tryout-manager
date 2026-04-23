import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DivisionCard } from '../components/league/DivisionCard';
import { AddDivisionModal } from '../components/league/AddDivisionModal';
import { useLeagueSeason, useLeagueDivisions, useCreateLeagueDivision } from '../api/leagueResults';
import { cn } from '../lib/utils';

type GenderTab = 'All' | 'Boys' | 'Girls';

export function LeagueDivisionsPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const id = Number(seasonId);

  const { data: season, isLoading: seasonLoading } = useLeagueSeason(id);
  const { data: divisions = [], isLoading: divisionsLoading } = useLeagueDivisions(id);
  const createDivision = useCreateLeagueDivision(id);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GenderTab>('All');

  const filtered = activeTab === 'All'
    ? divisions
    : divisions.filter((d) => d.gender === activeTab);

  const hasBoys = divisions.some((d) => d.gender === 'Boys');
  const hasGirls = divisions.some((d) => d.gender === 'Girls');
  const showTabs = hasBoys || hasGirls;

  if (seasonLoading) {
    return <div className="p-6 text-muted text-sm">Loading...</div>;
  }

  if (!season) {
    return <div className="p-6 text-muted text-sm">Season not found.</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/league-results')}
            className="flex items-center gap-1 text-muted hover:text-white text-xs mb-2 transition-colors"
          >
            <ChevronLeft size={14} />
            League Results
          </button>
          <h1 className="text-2xl font-bold text-white">{season.name}</h1>
          <p className="text-sm text-muted mt-0.5">{season.year} · {divisions.length} division{divisions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Add Division
        </Button>
      </div>

      {/* Gender tabs */}
      {showTabs && (
        <div className="flex gap-1 mb-4">
          {(['All', 'Boys', 'Girls'] as GenderTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-1.5 text-sm rounded-md transition-colors',
                activeTab === tab
                  ? 'bg-navy-700 text-white'
                  : 'text-muted hover:text-white hover:bg-navy-800'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {divisionsLoading ? (
        <div className="text-muted text-sm">Loading divisions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">
            {activeTab === 'All'
              ? 'No divisions yet. Add a division or import from the league URL.'
              : `No ${activeTab} divisions found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((division) => (
            <DivisionCard key={division.id} division={division} seasonId={id} />
          ))}
        </div>
      )}

      <AddDivisionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={(data) => createDivision.mutate(data, { onSuccess: () => setModalOpen(false) })}
        isLoading={createDivision.isPending}
      />
    </div>
  );
}
