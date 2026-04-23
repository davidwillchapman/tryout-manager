import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Pencil, Trash2, ExternalLink, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useUpdateLeagueSeason, useDeleteLeagueSeason } from '../../api/leagueResults';
import type { LeagueSeason, ImportSummary } from '../../types';

interface SeasonCardProps {
  season: LeagueSeason;
  isImporting?: boolean;
  importResult?: ImportSummary;
  onReImport: (seasonId: number) => void;
}

export function SeasonCard({ season, isImporting, importResult, onReImport }: SeasonCardProps) {
  const navigate = useNavigate();
  const updateSeason = useUpdateLeagueSeason();
  const deleteSeason = useDeleteLeagueSeason();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editName, setEditName] = useState(season.name);
  const [editYear, setEditYear] = useState(String(season.year));
  const [editDesc, setEditDesc] = useState(season.description ?? '');
  const [editUrl, setEditUrl] = useState(season.source_url ?? '');

  const openEdit = () => {
    setEditName(season.name);
    setEditYear(String(season.year));
    setEditDesc(season.description ?? '');
    setEditUrl(season.source_url ?? '');
    setEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSeason.mutate(
      { id: season.id, name: editName, year: parseInt(editYear, 10), description: editDesc || null, source_url: editUrl || null },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const handleDelete = () => {
    deleteSeason.mutate(season.id, { onSuccess: () => setDeleteOpen(false) });
  };

  const hasErrors = importResult && importResult.errors.length > 0;
  const importDone = importResult && !isImporting;

  return (
    <div
      className="bg-navy-800 rounded-lg border border-navy-600 p-4 cursor-pointer hover:border-navy-500 transition-colors group"
      onClick={() => navigate(`/league-results/${season.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{season.name}</h3>
          <p className="text-muted text-xs mt-0.5">{season.year}</p>
          {season.description && (
            <p className="text-muted text-xs mt-1 line-clamp-2">{season.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {season.source_url && (
            <Button variant="ghost" size="icon" onClick={() => onReImport(season.id)} disabled={isImporting} title="Re-import standings">
              {isImporting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>
          )}
          {season.source_url && (
            <a
              href={season.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source URL"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-8 w-8 rounded text-muted hover:text-white hover:bg-navy-700 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Button variant="ghost" size="icon" onClick={openEdit} title="Edit season">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} title="Delete season">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span>{season.division_count ?? 0} division{(season.division_count ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Import status */}
      {isImporting && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gold">
          <Loader2 size={12} className="animate-spin" />
          <span>Importing standings…</span>
        </div>
      )}
      {importDone && !hasErrors && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 size={12} />
          <span>{importResult!.divisions_found} divisions, {importResult!.teams_imported} teams imported</span>
        </div>
      )}
      {importDone && hasErrors && (
        <div className="mt-2 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle size={12} />
            <span>{importResult!.divisions_found} divisions, {importResult!.teams_imported} teams ({importResult!.errors.length} failed)</span>
          </div>
          <ul className="mt-1 pl-4 list-disc text-muted space-y-0.5">
            {importResult!.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
            {importResult!.errors.length > 3 && <li>+{importResult!.errors.length - 3} more</li>}
          </ul>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit Season">
          <form onSubmit={handleEdit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Season Name *</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Year *</label>
              <Input type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Description</label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">League Home Page URL</label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSeason.isPending || !editName}>
                {updateSeason.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent title="Delete Season" description={`Delete "${season.name}"? This will remove all divisions and standings.`}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleDelete} disabled={deleteSeason.isPending}>
              {deleteSeason.isPending ? 'Deleting...' : 'Delete Season'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
