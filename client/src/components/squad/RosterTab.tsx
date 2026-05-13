import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react';
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
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AddSquadPlayerModal } from './AddSquadPlayerModal';
import { useSquadPlayers, useUpdateSquadPlayer, useDeleteSquadPlayer, useUpdateDepthOrder } from '../../api/squad';
import { POSITIONS } from '../../lib/positions';
import { cn } from '../../lib/utils';
import type { SquadPlayer } from '../../types';

interface Props {
  teamId: number;
}

const STATUS_STYLES: Record<SquadPlayer['status'], string> = {
  active: 'bg-emerald-900/60 text-emerald-400',
  inactive: 'bg-navy-700 text-muted',
  injured: 'bg-amber-900/60 text-amber-400',
};

function EditRow({
  player,
  teamId,
  colSpan,
  onCancel,
}: {
  player: SquadPlayer;
  teamId: number;
  colSpan: number;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [jersey, setJersey] = useState(player.jersey_number ?? '');
  const [primary, setPrimary] = useState(player.primary_position ?? '');
  const [secondary, setSecondary] = useState(player.secondary_position ?? '');
  const [status, setStatus] = useState<SquadPlayer['status']>(player.status);
  const update = useUpdateSquadPlayer(teamId);

  function save() {
    update.mutate(
      {
        playerId: player.id,
        name: name.trim() || player.name,
        primary_position: primary || null,
        secondary_position: secondary || null,
        jersey_number: jersey || null,
        depth_order: player.depth_order,
        status,
      },
      { onSuccess: onCancel }
    );
  }

  return (
    <tr className="bg-navy-700">
      <td colSpan={colSpan} className="px-3 py-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Input value={jersey} onChange={(e) => setJersey(e.target.value)} className="h-7 text-xs w-16" placeholder="#" />
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs w-36" />
          <select
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-7 text-xs rounded border border-navy-600 bg-navy-800 px-2 text-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">— primary —</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
          </select>
          <select
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            className="h-7 text-xs rounded border border-navy-600 bg-navy-800 px-2 text-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">— secondary —</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SquadPlayer['status'])}
            className="h-7 text-xs rounded border border-navy-600 bg-navy-800 px-2 text-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="injured">Injured</option>
          </select>
          <button onClick={save} disabled={update.isPending} className="text-emerald-400 hover:text-emerald-300 p-1">
            <Check size={14} />
          </button>
          <button onClick={onCancel} className="text-muted hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SortableRow({
  player,
  rank,
  teamId,
  editingId,
  confirmDeleteId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onCancelEdit,
}: {
  player: SquadPlayer;
  rank: number;
  teamId: number;
  editingId: number | null;
  confirmDeleteId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onConfirmDelete: (id: number) => void;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const COL_SPAN = 8;

  if (editingId === player.id) {
    return (
      <EditRow
        key={player.id}
        player={player}
        teamId={teamId}
        colSpan={COL_SPAN}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn('border-b border-navy-800 group', isDragging ? 'opacity-50 bg-navy-700' : 'hover:bg-navy-800/50')}
    >
      <td className="px-1 py-2 w-6">
        <span
          {...attributes}
          {...listeners}
          className="text-navy-600 hover:text-muted cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical size={13} />
        </span>
      </td>
      <td className="px-2 py-2 text-muted text-xs w-6 text-center">{rank}</td>
      <td className="px-3 py-2 text-muted text-xs w-14">{player.jersey_number ?? '—'}</td>
      <td className="px-3 py-2 font-medium text-white">{player.name}</td>
      <td className="px-3 py-2 text-muted text-xs">{player.primary_position ?? '—'}</td>
      <td className="px-3 py-2 text-muted text-xs">{player.secondary_position ?? '—'}</td>
      <td className="px-3 py-2">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_STYLES[player.status])}>
          {player.status}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(player.id)} className="text-muted hover:text-white p-1">
            <Pencil size={13} />
          </button>
          {confirmDeleteId === player.id ? (
            <>
              <button onClick={() => onDelete(player.id)} className="text-red-400 hover:text-red-300 p-1">
                <Check size={13} />
              </button>
              <button onClick={onCancelDelete} className="text-muted hover:text-white p-1">
                <X size={13} />
              </button>
            </>
          ) : (
            <button onClick={() => onConfirmDelete(player.id)} className="text-muted hover:text-red-400 p-1">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function RosterTab({ teamId }: Props) {
  const { data: serverPlayers = [] } = useSquadPlayers(teamId);
  const deleteMutation = useDeleteSquadPlayer(teamId);
  const updateDepth = useUpdateDepthOrder(teamId);
  const [localPlayers, setLocalPlayers] = useState<SquadPlayer[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setLocalPlayers([...serverPlayers].sort((a, b) => a.depth_order - b.depth_order));
  }, [serverPlayers]);

  function handleDelete(id: number) {
    deleteMutation.mutate(id, { onSuccess: () => setConfirmDeleteId(null) });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localPlayers.findIndex((p) => p.id === active.id);
    const newIdx = localPlayers.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localPlayers, oldIdx, newIdx);
    setLocalPlayers(reordered);
    updateDepth.mutate(reordered.map((p, i) => ({ id: p.id, depth_order: i })));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-navy-700 shrink-0">
        <span className="text-xs text-muted">{localPlayers.length} players</span>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={12} /> Add Player
        </Button>
      </div>

      <div className="overflow-y-auto flex-1">
        {localPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted text-sm">
            No players yet. Add one to get started.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localPlayers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="w-6" />
                    <th className="text-left px-2 py-2 text-xs text-muted font-medium w-6">D</th>
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium w-14">#</th>
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium">Name</th>
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium">Primary</th>
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium">Secondary</th>
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium">Status</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {localPlayers.map((player, i) => (
                    <SortableRow
                      key={player.id}
                      player={player}
                      rank={i + 1}
                      teamId={teamId}
                      editingId={editingId}
                      confirmDeleteId={confirmDeleteId}
                      onEdit={setEditingId}
                      onDelete={handleDelete}
                      onConfirmDelete={setConfirmDeleteId}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AddSquadPlayerModal open={addOpen} teamId={teamId} onClose={() => setAddOpen(false)} />
    </div>
  );
}
