import { useState, useEffect } from 'react';
import { GripVertical, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSquadPlayers, useUpdateDepthOrder, useDepthChartEntries, useSaveDepthChart } from '../../api/squad';
import { POSITIONS } from '../../lib/positions';
import { cn } from '../../lib/utils';
import type { SquadPlayer } from '../../types';

type ViewMode = 'overall' | 'positional' | 'categorical';

type Assignments = Record<string, number[]>;

const POSITIONAL_GROUPS = POSITIONS.map((p) => ({
  key: p.value,
  label: p.label,
  abbr: p.value,
}));

const CATEGORICAL_GROUPS = [
  { key: 'attack', label: 'Attack' },
  { key: 'midfield', label: 'Midfield' },
  { key: 'defense', label: 'Defense' },
  { key: 'goalkeeper', label: 'Goalkeeper' },
] as const;

interface Props {
  teamId: number;
}

// ── Overall view: sortable card with rank ─────────────────────────────────────
function OverallCard({ player, rank }: { player: SquadPlayer; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded bg-navy-800 border border-navy-700 select-none',
        isDragging ? 'opacity-50 border-gold/60' : 'hover:border-navy-600'
      )}
    >
      <span {...attributes} {...listeners} className="text-navy-600 hover:text-muted cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical size={13} />
      </span>
      <span className="text-[10px] text-navy-500 w-4 shrink-0 text-right tabular-nums">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {player.jersey_number && <span className="text-muted text-[10px] shrink-0">#{player.jersey_number}</span>}
          <span className="text-xs text-white truncate">{player.name}</span>
        </div>
        {(player.primary_position || player.secondary_position) && (
          <div className="text-[9px] text-muted leading-tight">
            {[player.primary_position, player.secondary_position].filter(Boolean).join(' / ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar card: HTML5 draggable source ──────────────────────────────────────
function SidebarCard({ player }: { player: SquadPlayer }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('playerId', String(player.id));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="px-2 py-1.5 rounded bg-navy-800 border border-navy-700 cursor-grab active:cursor-grabbing select-none hover:border-navy-600"
    >
      <div className="flex items-center gap-1.5">
        {player.jersey_number && <span className="text-muted text-[10px] w-4 shrink-0">{player.jersey_number}</span>}
        <span className="text-xs text-white truncate">{player.name}</span>
      </div>
      {(player.primary_position || player.secondary_position) && (
        <div className="text-[9px] text-muted leading-tight">
          {[player.primary_position, player.secondary_position].filter(Boolean).join(' / ')}
        </div>
      )}
    </div>
  );
}

// ── Group card: @dnd-kit sortable + remove button ─────────────────────────────
function GroupCard({ sortId, player, onRemove }: { sortId: string; player: SquadPlayer; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded bg-navy-800 border border-navy-700 select-none group/card',
        isDragging ? 'opacity-50 border-gold/60' : 'hover:border-navy-600'
      )}
    >
      <span {...attributes} {...listeners} className="text-navy-600 hover:text-muted cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical size={12} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {player.jersey_number && <span className="text-muted text-[10px] w-4 shrink-0">{player.jersey_number}</span>}
          <span className="text-xs text-white truncate">{player.name}</span>
        </div>
        {(player.primary_position || player.secondary_position) && (
          <div className="text-[9px] text-muted leading-tight">
            {[player.primary_position, player.secondary_position].filter(Boolean).join(' / ')}
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover/card:opacity-100 text-navy-600 hover:text-red-400 transition-colors shrink-0 p-0.5"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Group column: HTML5 drop zone + @dnd-kit sortable list ────────────────────
function GroupColumn({
  groupKey,
  label,
  playerIds,
  allPlayers,
  onDrop,
  onRemove,
  onReorder,
}: {
  groupKey: string;
  label: string;
  playerIds: number[];
  allPlayers: SquadPlayer[];
  onDrop: (groupKey: string, playerId: number) => void;
  onRemove: (groupKey: string, index: number) => void;
  onReorder: (groupKey: string, newIds: number[]) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Unique sort IDs per slot so @dnd-kit has stable keys
  const sortIds = playerIds.map((id, i) => `${groupKey}:${id}:${i}`);
  const players = playerIds.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean) as SquadPlayer[];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = sortIds.indexOf(active.id as string);
    const toIdx = sortIds.indexOf(over.id as string);
    if (fromIdx === -1 || toIdx === -1) return;
    onReorder(groupKey, arrayMove(playerIds, fromIdx, toIdx));
  }

  return (
    <div className="flex flex-col w-[190px] shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-navy-500">{players.length}</span>
      </div>
      <div
        className={cn(
          'flex-1 min-h-[56px] rounded border border-dashed p-1 flex flex-col gap-1 transition-colors',
          isOver ? 'border-gold bg-gold/5' : 'border-navy-700'
        )}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsOver(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          const playerId = parseInt(e.dataTransfer.getData('playerId'), 10);
          if (!isNaN(playerId)) onDrop(groupKey, playerId);
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            {players.map((player, i) => (
              <GroupCard
                key={sortIds[i]}
                sortId={sortIds[i]}
                player={player}
                onRemove={() => onRemove(groupKey, i)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {players.length === 0 && (
          <p className="text-[10px] text-navy-600 text-center py-3 pointer-events-none">Drop players here</p>
        )}
      </div>
    </div>
  );
}

// ── Grouped layout (sidebar + columns) ───────────────────────────────────────
function GroupedLayout({
  groups,
  assignments,
  allPlayers,
  onDrop,
  onRemove,
  onReorder,
}: {
  groups: readonly { key: string; label: string }[];
  assignments: Assignments;
  allPlayers: SquadPlayer[];
  onDrop: (groupKey: string, playerId: number) => void;
  onRemove: (groupKey: string, index: number) => void;
  onReorder: (groupKey: string, newIds: number[]) => void;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-navy-700 shrink-0">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Players</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {allPlayers.map((player) => (
            <SidebarCard key={player.id} player={player} />
          ))}
        </div>
      </div>

      {/* Group columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-4 p-4 min-h-full">
          {groups.map((group) => (
            <GroupColumn
              key={group.key}
              groupKey={group.key}
              label={group.label}
              playerIds={assignments[group.key] ?? []}
              allPlayers={allPlayers}
              onDrop={onDrop}
              onRemove={onRemove}
              onReorder={onReorder}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DepthChartTab({ teamId }: Props) {
  const { data: serverPlayers = [] } = useSquadPlayers(teamId);
  const updateDepth = useUpdateDepthOrder(teamId);
  const [localPlayers, setLocalPlayers] = useState<SquadPlayer[]>([]);
  const [view, setView] = useState<ViewMode>('overall');

  const { data: positionalServerData } = useDepthChartEntries(teamId, 'positional');
  const { data: categoricalServerData } = useDepthChartEntries(teamId, 'categorical');
  const savePositional = useSaveDepthChart(teamId, 'positional');
  const saveCategorical = useSaveDepthChart(teamId, 'categorical');

  const [positionalAssignments, setPositionalAssignments] = useState<Assignments>({});
  const [categoricalAssignments, setCategoricalAssignments] = useState<Assignments>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setLocalPlayers([...serverPlayers].sort((a, b) => a.depth_order - b.depth_order));
  }, [serverPlayers]);

  // Seed local state from server on first load (don't overwrite mid-session)
  useEffect(() => {
    if (positionalServerData) setPositionalAssignments(positionalServerData);
  }, [positionalServerData]);

  useEffect(() => {
    if (categoricalServerData) setCategoricalAssignments(categoricalServerData);
  }, [categoricalServerData]);

  // Overall view handlers
  function handleOverallDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localPlayers.findIndex((p) => p.id === active.id);
    const newIdx = localPlayers.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localPlayers, oldIdx, newIdx);
    setLocalPlayers(reordered);
    updateDepth.mutate(reordered.map((p, i) => ({ id: p.id, depth_order: i })));
  }

  // Shared handlers for grouped views — save fires with new state on every change
  function makeHandlers(
    setAssignments: React.Dispatch<React.SetStateAction<Assignments>>,
    save: (a: Assignments) => void
  ) {
    return {
      onDrop(groupKey: string, playerId: number) {
        setAssignments((prev) => {
          const current = prev[groupKey] ?? [];
          if (current.includes(playerId)) return prev;
          const next = { ...prev, [groupKey]: [...current, playerId] };
          save(next);
          return next;
        });
      },
      onRemove(groupKey: string, index: number) {
        setAssignments((prev) => {
          const next = { ...prev, [groupKey]: (prev[groupKey] ?? []).filter((_, i) => i !== index) };
          save(next);
          return next;
        });
      },
      onReorder(groupKey: string, newIds: number[]) {
        setAssignments((prev) => {
          const next = { ...prev, [groupKey]: newIds };
          save(next);
          return next;
        });
      },
    };
  }

  const positionalHandlers = makeHandlers(setPositionalAssignments, (a) => savePositional.mutate(a));
  const categoricalHandlers = makeHandlers(setCategoricalAssignments, (a) => saveCategorical.mutate(a));

  if (localPlayers.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex gap-1 px-4 py-2 border-b border-navy-700 shrink-0">
          {(['overall', 'positional', 'categorical'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('text-xs py-1 px-3 rounded transition-colors capitalize', view === v ? 'bg-navy-700 text-white' : 'text-muted hover:text-white hover:bg-navy-800')}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-muted text-sm gap-1">
          <p>No players in roster.</p>
          <p className="text-xs">Add players in the Roster tab first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 px-4 py-2 border-b border-navy-700 shrink-0">
        {([['overall', 'Overall'], ['positional', 'Positional'], ['categorical', 'Categorical']] as [ViewMode, string][]).map(
          ([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'text-xs py-1 px-3 rounded transition-colors',
                view === v ? 'bg-navy-700 text-white' : 'text-muted hover:text-white hover:bg-navy-800'
              )}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* ── Overall ── */}
      {view === 'overall' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-sm mx-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOverallDragEnd}>
              <SortableContext items={localPlayers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {localPlayers.map((player, i) => (
                    <OverallCard key={player.id} player={player} rank={i + 1} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* ── Positional ── */}
      {view === 'positional' && (
        <div className="flex-1 overflow-hidden">
          <GroupedLayout
            groups={POSITIONAL_GROUPS}
            assignments={positionalAssignments}
            allPlayers={localPlayers}
            {...positionalHandlers}
          />
        </div>
      )}

      {/* ── Categorical ── */}
      {view === 'categorical' && (
        <div className="flex-1 overflow-hidden">
          <GroupedLayout
            groups={CATEGORICAL_GROUPS}
            assignments={categoricalAssignments}
            allPlayers={localPlayers}
            {...categoricalHandlers}
          />
        </div>
      )}
    </div>
  );
}
