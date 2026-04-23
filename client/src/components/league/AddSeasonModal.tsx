import { useState } from 'react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface AddSeasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; year: number; description?: string | null; source_url?: string | null }) => void;
  isLoading?: boolean;
}

export function AddSeasonModal({ open, onOpenChange, onSubmit, isLoading }: AddSeasonModalProps) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const reset = () => {
    setName('');
    setYear(String(currentYear));
    setDescription('');
    setSourceUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      year: parseInt(year, 10),
      description: description || null,
      source_url: sourceUrl || null,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent title="New Season">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Season Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 OYSA Winter League"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Year *</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              min={1900}
              max={2100}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">League Home Page URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://...affinitysoccer.com/accepted_list.asp?tournamentguid=..."
            />
            {sourceUrl && (
              <p className="text-xs text-muted mt-1">Standings will be imported automatically after creating.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !year}>
              {isLoading ? 'Creating...' : 'Create Season'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
