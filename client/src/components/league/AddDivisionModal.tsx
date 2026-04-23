import { useState } from 'react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AddDivisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    age_group?: string | null;
    gender?: string | null;
    division?: string | null;
    source_url?: string | null;
  }) => void;
  isLoading?: boolean;
}

const GENDER_OPTIONS = ['', 'Boys', 'Girls'];

export function AddDivisionModal({ open, onOpenChange, onSubmit, isLoading }: AddDivisionModalProps) {
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [division, setDivision] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const reset = () => {
    setName('');
    setAgeGroup('');
    setGender('');
    setDivision('');
    setSourceUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      age_group: ageGroup || null,
      gender: gender || null,
      division: division || null,
      source_url: sourceUrl || null,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent title="Add Division">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Division Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BU15 SCL Premier"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Age Group</label>
              <Input
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                placeholder="e.g. BU15"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
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
            <Input
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. SCL Premier"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Standings URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? 'Adding...' : 'Add Division'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
