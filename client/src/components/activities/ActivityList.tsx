import { useState, useMemo } from 'react';
import { Search, Clock, Tag } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useActivities } from '../../api/activities';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../lib/utils';
import type { Activity } from '../../types';

interface ActivityListProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ActivityList({ selectedId, onSelect }: ActivityListProps) {
  const { data: activities = [], isLoading } = useActivities();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedQuery = useDebounce(query);

  const types = useMemo(() => {
    const set = new Set(activities.map((a) => a.activity_type).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter && a.activity_type !== typeFilter) return false;
      if (debouncedQuery.trim()) {
        return a.title.toLowerCase().includes(debouncedQuery.toLowerCase());
      }
      return true;
    });
  }, [activities, typeFilter, debouncedQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-2 p-3 border-b border-navy-700 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-7 h-8 text-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="flex h-8 w-full rounded border border-navy-600 bg-navy-900 px-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold"
        >
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <p className="text-xs text-muted px-4 py-3">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted px-4 py-3">
            {activities.length === 0 ? 'No activities yet. Create or import one.' : 'No results.'}
          </p>
        ) : (
          filtered.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              selected={selectedId === a.id}
              onSelect={() => onSelect(a.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ActivityRowProps {
  activity: Activity;
  selected: boolean;
  onSelect: () => void;
}

function ActivityRow({ activity, selected, onSelect }: ActivityRowProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-4 py-3 cursor-pointer border-l-2 transition-colors',
        selected
          ? 'border-gold bg-navy-800 text-white'
          : 'border-transparent text-muted hover:bg-navy-800 hover:text-white'
      )}
    >
      <p className="text-sm font-medium truncate text-white">{activity.title}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {activity.activity_type && (
          <Badge className="text-xs">{activity.activity_type}</Badge>
        )}
        {activity.duration_minutes && (
          <span className="flex items-center gap-0.5 text-xs text-muted">
            <Clock size={10} /> {activity.duration_minutes}m
          </span>
        )}
        {(activity.tag_count ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted">
            <Tag size={10} /> {activity.tag_count}
          </span>
        )}
      </div>
    </div>
  );
}
