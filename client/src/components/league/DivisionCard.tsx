import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useUpdateLeagueDivision, useDeleteLeagueDivision } from '../../api/leagueResults';
import type { LeagueDivision } from '../../types';
import { cn } from '../../lib/utils';

interface DivisionCardProps {
  division: LeagueDivision;
  seasonId: number;
}

const GENDER_OPTIONS = ['', 'Boys', 'Girls'];

export function DivisionCard({ division, seasonId }: DivisionCardProps) {
  const navigate = useNavigate();
  const updateDivision = useUpdateLeagueDivision(seasonId);
  const deleteDivision = useDeleteLeagueDivision(seasonId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editName, setEditName] = useState(division.name);
  const [editAgeGroup, setEditAgeGroup] = useState(division.age_group ?? '');
  const [editGender, setEditGender] = useState(division.gender ?? '');
  const [editDivision, setEditDivision] = useState(division.division ?? '');
  const [editUrl, setEditUrl] = useState(division.source_url ?? '');

  const openEdit = () => {
    setEditName(division.name);
    setEditAgeGroup(division.age_group ?? '');
    setEditGender(division.gender ?? '');
    setEditDivision(division.division ?? '');
    setEditUrl(division.source_url ?? '');
    setEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDivision.mutate(
      {
        id: division.id,
        name: editName,
        age_group: editAgeGroup || null,
        gender: editGender || null,
        division: editDivision || null,
        source_url: editUrl || null,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const handleDelete = () => {
    deleteDivision.mutate(division.id, { onSuccess: () => setDeleteOpen(false) });
  };

  return (
    <div
      className="bg-navy-800 rounded-lg border border-navy-600 p-3 cursor-pointer hover:border-navy-500 transition-colors group"
      onClick={() => navigate(`/league-results/${seasonId}/${division.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-white text-sm font-medium truncate">{division.name}</h4>
          {division.division && (
            <p className="text-muted text-xs mt-0.5">{division.division}</p>
          )}
        </div>
        <div
          className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {division.source_url && (
            <a
              href={division.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open standings page"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-7 w-7 rounded text-muted hover:text-white hover:bg-navy-700 transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openEdit}>
            <Pencil size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <Users size={11} />
        <span>{division.team_count ?? 0} team{(division.team_count ?? 0) !== 1 ? 's' : ''}</span>
        {division.age_group && (
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium',
            division.gender === 'Boys' ? 'bg-blue-900/50 text-blue-300' :
            division.gender === 'Girls' ? 'bg-pink-900/50 text-pink-300' :
            'bg-navy-700 text-muted'
          )}>
            {division.age_group}
          </span>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit Division">
          <form onSubmit={handleEdit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Division Name *</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Age Group</label>
                <Input value={editAgeGroup} onChange={(e) => setEditAgeGroup(e.target.value)} placeholder="e.g. BU15" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="w-full h-9 rounded-md bg-navy-800 border border-navy-600 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g || '—'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Division Level</label>
              <Input value={editDivision} onChange={(e) => setEditDivision(e.target.value)} placeholder="e.g. SCL Premier" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Standings URL</label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateDivision.isPending || !editName}>
                {updateDivision.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent title="Delete Division" description={`Delete "${division.name}"? All standings in this division will be removed.`}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleDelete} disabled={deleteDivision.isPending}>
              {deleteDivision.isPending ? 'Deleting...' : 'Delete Division'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
