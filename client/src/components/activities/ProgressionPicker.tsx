import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useActivities, useAddProgression } from '../../api/activities';
import type { ActivityProgression } from '../../types';

interface ProgressionPickerProps {
  activityId: number;
  existingProgressions: ActivityProgression[];
  open: boolean;
  onClose: () => void;
}

export function ProgressionPicker({ activityId, existingProgressions, open, onClose }: ProgressionPickerProps) {
  const [query, setQuery] = useState('');
  const { data: activities = [] } = useActivities();
  const addProgression = useAddProgression();

  const linkedIds = new Set(existingProgressions.map((p) => p.progression_activity_id));

  const filtered = activities.filter((a) => {
    if (a.id === activityId) return false;
    if (linkedIds.has(a.id)) return false;
    if (!query.trim()) return true;
    return a.title.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelect = (progressionActivityId: number) => {
    addProgression.mutate(
      { activityId, progression_activity_id: progressionActivityId },
      {
        onSuccess: () => {
          setQuery('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Add Progression">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities…"
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted px-2 py-3 text-center">
                {query ? 'No matching activities.' : 'No activities available.'}
              </p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a.id)}
                  disabled={addProgression.isPending}
                  className="text-left px-3 py-2 rounded hover:bg-navy-700 transition-colors group"
                >
                  <p className="text-sm text-white font-medium group-hover:text-gold transition-colors">{a.title}</p>
                  {a.activity_type && (
                    <p className="text-xs text-muted mt-0.5">{a.activity_type}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {addProgression.isError && (
            <p className="text-xs text-red-400">{String((addProgression.error as Error).message)}</p>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
