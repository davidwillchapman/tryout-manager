import { useState, useMemo } from 'react';
import { Search, Clock } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useActivities } from '../../api/activities';
import { useAddActivityToSession } from '../../api/sessions';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../lib/utils';
import type { SessionActivity } from '../../types';

interface AddActivityToSessionModalProps {
  sessionId: number;
  existingActivities: SessionActivity[];
  open: boolean;
  onClose: () => void;
}

export function AddActivityToSessionModal({ sessionId, existingActivities, open, onClose }: AddActivityToSessionModalProps) {
  const { data: activities = [] } = useActivities();
  const addActivity = useAddActivityToSession();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);

  const existingIds = useMemo(() => new Set(existingActivities.map((sa) => sa.activity.id)), [existingActivities]);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return activities;
    return activities.filter((a) => a.title.toLowerCase().includes(debouncedQuery.toLowerCase()));
  }, [activities, debouncedQuery]);

  const handleSelect = (activityId: number) => {
    if (existingIds.has(activityId)) return;
    addActivity.mutate({ sessionId, activity_id: activityId }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Add Activity to Session" className="max-w-lg">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities…"
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted px-2 py-3">No activities found.</p>
            ) : (
              filtered.map((a) => {
                const alreadyAdded = existingIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    disabled={alreadyAdded || addActivity.isPending}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2 rounded text-left transition-colors',
                      alreadyAdded
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-navy-800 cursor-pointer'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.activity_type && <Badge className="text-xs">{a.activity_type}</Badge>}
                        {a.duration_minutes && (
                          <span className="flex items-center gap-0.5 text-xs text-muted">
                            <Clock size={10} /> {a.duration_minutes}m
                          </span>
                        )}
                        {alreadyAdded && <span className="text-xs text-muted italic">already added</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {addActivity.isError && (
            <p className="text-xs text-red-400">{(addActivity.error as Error).message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
