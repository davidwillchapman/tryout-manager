import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { AddStandingEntryModal } from './AddStandingEntryModal';
import { useUpdateLeagueStanding, useDeleteLeagueStanding } from '../../api/leagueResults';
import type { LeagueStanding } from '../../types';
import { cn } from '../../lib/utils';

interface StandingsTableProps {
  standings: LeagueStanding[];
  divisionId: number;
}

export function StandingsTable({ standings, divisionId }: StandingsTableProps) {
  const updateStanding = useUpdateLeagueStanding(divisionId);
  const deleteStanding = useDeleteLeagueStanding(divisionId);

  const [editEntry, setEditEntry] = useState<LeagueStanding | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LeagueStanding | null>(null);

  if (standings.length === 0) {
    return (
      <div className="text-center py-10 text-muted text-sm">
        No teams in this division yet. Add a team to get started.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-navy-600">
              <th className="text-left py-2 pr-2 w-8">#</th>
              <th className="text-left py-2 pr-2">Team</th>
              <th className="text-right py-2 px-2 w-12">Pts</th>
              <th className="text-right py-2 px-2 w-12">GP</th>
              <th className="text-right py-2 px-2 w-10">W</th>
              <th className="text-right py-2 px-2 w-10">L</th>
              <th className="text-right py-2 px-2 w-10">T</th>
              <th className="text-right py-2 px-2 w-12">GF</th>
              <th className="text-right py-2 px-2 w-12">GA</th>
              <th className="text-right py-2 px-2 w-14">GD</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const rank = s.finish_place ?? i + 1;
              const gd = s.goals_for - s.goals_against;
              const isChampion = rank === 1;

              return (
                <tr
                  key={s.id}
                  className={cn(
                    'border-b border-navy-700/50 last:border-0 group',
                    isChampion && 'bg-amber-900/20'
                  )}
                >
                  <td className="py-2 pr-2 text-muted text-xs">{rank}</td>
                  <td className={cn('py-2 pr-2 font-medium', isChampion ? 'text-amber-300' : 'text-white')}>
                    {s.team_name}
                  </td>
                  <td className={cn('py-2 px-2 text-right font-semibold', isChampion ? 'text-amber-300' : 'text-white')}>
                    {s.points}
                  </td>
                  <td className="py-2 px-2 text-right text-muted">{s.games_played}</td>
                  <td className="py-2 px-2 text-right text-muted">{s.wins}</td>
                  <td className="py-2 px-2 text-right text-muted">{s.losses}</td>
                  <td className="py-2 px-2 text-right text-muted">{s.ties}</td>
                  <td className="py-2 px-2 text-right text-muted">{s.goals_for}</td>
                  <td className="py-2 px-2 text-right text-muted">{s.goals_against}</td>
                  <td className={cn('py-2 px-2 text-right', gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-muted')}>
                    {gd > 0 ? `+${gd}` : gd}
                  </td>
                  <td className="py-2 pl-2">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditEntry(s)}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteEntry(s)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <AddStandingEntryModal
        open={!!editEntry}
        onOpenChange={(v) => { if (!v) setEditEntry(null); }}
        initial={editEntry ?? undefined}
        onSubmit={(data) => {
          if (!editEntry) return;
          updateStanding.mutate(
            { id: editEntry.id, ...data },
            { onSuccess: () => setEditEntry(null) }
          );
        }}
        isLoading={updateStanding.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteEntry} onOpenChange={(v) => { if (!v) setDeleteEntry(null); }}>
        <DialogContent
          title="Remove Team"
          description={`Remove "${deleteEntry?.team_name}" from the standings?`}
        >
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => deleteEntry && deleteStanding.mutate(deleteEntry.id, { onSuccess: () => setDeleteEntry(null) })}
              disabled={deleteStanding.isPending}
            >
              {deleteStanding.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
