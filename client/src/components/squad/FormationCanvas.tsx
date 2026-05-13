import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, RotateCcw, Layout } from 'lucide-react';
import { Button } from '../ui/Button';
import { useSquadPlayers, useFormation, useSaveFormationSlots, useUpdateSlotPositions } from '../../api/squad';
import { cn } from '../../lib/utils';
import type { FormationSlot, SquadPlayer } from '../../types';

interface Props {
  teamId: number;
  formationId: number;
}

type SlotState = Map<number, number | null>; // slotId -> squadPlayerId | null
type PositionState = Map<number, { x_pct: number; y_pct: number }>;

function truncate(s: string, max = 9) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function SoccerFieldSVG() {
  return (
    <svg
      viewBox="0 0 100 150"
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(180deg, #1a4a2a 0%, #1e5530 100%)' }}
    >
      <rect x="5" y="5" width="90" height="140" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <rect x="25" y="5" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="35" y="5" width="30" height="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <rect x="25" y="127" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="35" y="135" width="30" height="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    </svg>
  );
}

export function FormationCanvas({ teamId, formationId }: Props) {
  const { data: formation } = useFormation(teamId, formationId);
  const { data: players = [] } = useSquadPlayers(teamId);
  const saveSlots = useSaveFormationSlots(teamId, formationId);
  const updateSlotPositions = useUpdateSlotPositions(teamId, formationId);

  const [assignments, setAssignments] = useState<SlotState>(new Map());
  const [saved, setSaved] = useState<SlotState>(new Map());
  const [draggingPlayerId, setDraggingPlayerId] = useState<number | null>(null);
  const [draggingFromSlotId, setDraggingFromSlotId] = useState<number | null>(null);
  const [overSlotId, setOverSlotId] = useState<number | null>(null);
  const [formationName, setFormationName] = useState('');
  const [editingName, setEditingName] = useState(false);

  // Edit Layout mode
  const [editLayout, setEditLayout] = useState(false);
  const [positions, setPositions] = useState<PositionState>(new Map());
  const [savedPositions, setSavedPositions] = useState<PositionState>(new Map());
  const fieldRef = useRef<HTMLDivElement>(null);
  const draggingSlotRef = useRef<{ slotId: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!formation?.slots) return;
    const map: SlotState = new Map();
    const posMap: PositionState = new Map();
    for (const slot of formation.slots) {
      map.set(slot.id, slot.squad_player_id ?? null);
      posMap.set(slot.id, { x_pct: slot.x_pct, y_pct: slot.y_pct });
    }
    setAssignments(new Map(map));
    setSaved(new Map(map));
    setPositions(new Map(posMap));
    setSavedPositions(new Map(posMap));
    setFormationName(formation.name);
  }, [formation]);

  const assignedPlayerIds = new Set(
    Array.from(assignments.values()).filter((v): v is number => v !== null)
  );

  const starterSlots = (formation?.slots ?? []).filter((s) => s.role === 'starter');
  const subSlots = (formation?.slots ?? []).filter((s) => s.role === 'first_sub');
  const unassignedPlayers = players.filter((p) => p.status !== 'inactive' && !assignedPlayerIds.has(p.id));

  function getPlayer(playerId: number | null | undefined): SquadPlayer | undefined {
    if (!playerId) return undefined;
    return players.find((p) => p.id === playerId);
  }

  // ── Player assignment drag ────────────────────────────────────────────────
  function handleRosterDragStart(e: React.DragEvent, player: SquadPlayer) {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingPlayerId(player.id);
    setDraggingFromSlotId(null);
  }

  function handleSlotDragStart(e: React.DragEvent, slot: FormationSlot) {
    const pid = assignments.get(slot.id) ?? null;
    if (!pid) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    setDraggingPlayerId(pid);
    setDraggingFromSlotId(slot.id);
  }

  function handleSlotDragOver(e: React.DragEvent, slotId: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverSlotId(slotId);
  }

  function handleSlotDrop(e: React.DragEvent, targetSlot: FormationSlot) {
    e.preventDefault();
    if (draggingPlayerId === null) return;
    setAssignments((prev) => {
      const next = new Map(prev);
      const targetCurrent = next.get(targetSlot.id) ?? null;
      if (draggingFromSlotId !== null) {
        next.set(draggingFromSlotId, targetCurrent);
        next.set(targetSlot.id, draggingPlayerId);
      } else {
        next.set(targetSlot.id, draggingPlayerId);
      }
      return next;
    });
    setDraggingPlayerId(null);
    setDraggingFromSlotId(null);
    setOverSlotId(null);
  }

  function handleRosterDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggingFromSlotId === null || draggingPlayerId === null) return;
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(draggingFromSlotId, null);
      return next;
    });
    setDraggingPlayerId(null);
    setDraggingFromSlotId(null);
    setOverSlotId(null);
  }

  function handleDragEnd() {
    setDraggingPlayerId(null);
    setDraggingFromSlotId(null);
    setOverSlotId(null);
  }

  function handleSave() {
    const payload = Array.from(assignments.entries()).map(([slot_id, squad_player_id]) => ({ slot_id, squad_player_id }));
    saveSlots.mutate(payload, { onSuccess: () => setSaved(new Map(assignments)) });
  }

  function handleReset() {
    setAssignments(new Map(saved));
  }

  // ── Edit Layout mode: slot position drag ──────────────────────────────────
  const pointerMove = useCallback((e: PointerEvent) => {
    if (!draggingSlotRef.current || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const dx = e.clientX - draggingSlotRef.current.startX;
    const dy = e.clientY - draggingSlotRef.current.startY;
    const newX = Math.max(0, Math.min(100, draggingSlotRef.current.origX + (dx / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, draggingSlotRef.current.origY + (dy / rect.height) * 100));
    const slotId = draggingSlotRef.current.slotId;
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(slotId, { x_pct: Math.round(newX * 10) / 10, y_pct: Math.round(newY * 10) / 10 });
      return next;
    });
  }, []);

  const pointerUp = useCallback(() => {
    draggingSlotRef.current = null;
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
  }, [pointerMove]);

  function handleSlotPointerDown(e: React.PointerEvent, slot: FormationSlot) {
    e.preventDefault();
    e.stopPropagation();
    const pos = positions.get(slot.id) ?? { x_pct: slot.x_pct, y_pct: slot.y_pct };
    draggingSlotRef.current = {
      slotId: slot.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x_pct,
      origY: pos.y_pct,
    };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
  }

  function handleSaveLayout() {
    const payload = Array.from(positions.entries()).map(([slot_id, { x_pct, y_pct }]) => ({ slot_id, x_pct, y_pct }));
    updateSlotPositions.mutate(payload, { onSuccess: () => setSavedPositions(new Map(positions)) });
  }

  function handleResetLayout() {
    setPositions(new Map(savedPositions));
  }

  let isDirty = false;
  for (const [k, v] of assignments) {
    if (saved.get(k) !== v) { isDirty = true; break; }
  }

  let isLayoutDirty = false;
  for (const [k, v] of positions) {
    const s = savedPositions.get(k);
    if (!s || s.x_pct !== v.x_pct || s.y_pct !== v.y_pct) { isLayoutDirty = true; break; }
  }

  if (!formation) return <div className="flex items-center justify-center h-full text-muted text-sm">Loading…</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Roster sidebar — hidden in edit-layout mode */}
      {!editLayout && (
        <div
          className="w-44 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={handleRosterDrop}
        >
          <div className="px-3 py-2 border-b border-navy-700 shrink-0">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Available</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {unassignedPlayers.length === 0 ? (
              <p className="text-[10px] text-navy-600 text-center pt-4">All assigned</p>
            ) : (
              unassignedPlayers.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => handleRosterDragStart(e, p)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'px-2 py-1.5 rounded bg-navy-800 border border-navy-700 cursor-grab active:cursor-grabbing',
                    'text-xs text-white select-none',
                    draggingPlayerId === p.id && 'opacity-40'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {p.jersey_number && <span className="text-muted text-[10px] w-4 shrink-0">{p.jersey_number}</span>}
                    <span className="truncate">{p.name}</span>
                  </div>
                  {p.primary_position && <span className="text-[9px] text-muted">{p.primary_position}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-700 shrink-0 flex-wrap gap-y-2">
          {editingName ? (
            <input
              autoFocus
              value={formationName}
              onChange={(e) => setFormationName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="text-sm font-semibold text-white bg-transparent border-b border-gold outline-none"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-white hover:text-gold transition-colors">
              {formationName}
            </button>
          )}
          <span className="text-xs text-muted border border-navy-600 px-1.5 py-0.5 rounded">{formation.formation_code}</span>

          {/* Edit Layout toggle */}
          <button
            onClick={() => setEditLayout((v) => !v)}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              editLayout
                ? 'border-gold text-gold bg-gold/10'
                : 'border-navy-600 text-muted hover:text-white hover:border-navy-500'
            )}
          >
            <Layout size={11} /> Edit Layout
          </button>

          <div className="ml-auto flex gap-2">
            {editLayout ? (
              <>
                <Button variant="outline" size="sm" onClick={handleResetLayout} disabled={!isLayoutDirty}>
                  <RotateCcw size={12} /> Reset
                </Button>
                <Button size="sm" onClick={handleSaveLayout} disabled={!isLayoutDirty || updateSlotPositions.isPending}>
                  <Save size={12} /> {updateSlotPositions.isPending ? 'Saving…' : 'Save Layout'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty}>
                  <RotateCcw size={12} /> Reset
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!isDirty || saveSlots.isPending}>
                  <Save size={12} /> {saveSlots.isPending ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col items-center gap-4">
          {/* Field + slot overlay */}
          <div className="w-full max-w-xs">
            <div
              ref={editLayout ? fieldRef : undefined}
              className="relative rounded border border-navy-600 overflow-hidden select-none"
              style={{ paddingBottom: '150%' }}
            >
              <SoccerFieldSVG />
              {starterSlots.map((slot) => {
                const pos = positions.get(slot.id) ?? { x_pct: slot.x_pct, y_pct: slot.y_pct };
                const pid = assignments.get(slot.id) ?? null;
                const player = getPlayer(pid);
                const isOver = overSlotId === slot.id;

                if (editLayout) {
                  return (
                    <div
                      key={slot.id}
                      style={{ left: `${pos.x_pct}%`, top: `${pos.y_pct}%`, transform: 'translate(-50%, -50%)' }}
                      className="absolute w-11 h-11 rounded-full flex flex-col items-center justify-center border-2 border-gold bg-gold/20 cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => handleSlotPointerDown(e, slot)}
                    >
                      <span className="text-[9px] text-white font-semibold leading-tight text-center px-0.5">
                        {slot.slot_label}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot.id}
                    style={{ left: `${pos.x_pct}%`, top: `${pos.y_pct}%`, transform: 'translate(-50%, -50%)' }}
                    className="absolute"
                    onDragOver={(e) => handleSlotDragOver(e, slot.id)}
                    onDrop={(e) => handleSlotDrop(e, slot)}
                    onDragLeave={() => setOverSlotId(null)}
                  >
                    {player ? (
                      <div
                        draggable
                        onDragStart={(e) => handleSlotDragStart(e, slot)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'w-11 h-11 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none text-center',
                          isOver ? 'bg-gold border-2 border-gold' : 'bg-navy-700 border-2 border-blue-500',
                          draggingFromSlotId === slot.id && 'opacity-40'
                        )}
                      >
                        <span className="text-[9px] text-white font-semibold leading-tight truncate w-10 text-center px-0.5">
                          {truncate(player.name.split(' ').pop() ?? player.name)}
                        </span>
                        {player.jersey_number && (
                          <span className="text-[8px] text-blue-300 leading-tight">#{player.jersey_number}</span>
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center border-2 border-dashed select-none',
                          isOver ? 'border-gold bg-gold/20' : 'border-white/20 bg-white/5'
                        )}
                      >
                        <span className="text-[9px] text-white/40 text-center leading-tight">{slot.slot_label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* First subs bench — hidden in edit-layout mode */}
          {!editLayout && subSlots.length > 0 && (
            <div className="w-full max-w-xs">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">First Subs</p>
              <div className="flex gap-2 flex-wrap">
                {subSlots.map((slot) => {
                  const pid = assignments.get(slot.id) ?? null;
                  const player = getPlayer(pid);
                  const isOver = overSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      onDragOver={(e) => handleSlotDragOver(e, slot.id)}
                      onDrop={(e) => handleSlotDrop(e, slot)}
                      onDragLeave={() => setOverSlotId(null)}
                      className={cn(
                        'flex-1 min-w-[72px] px-2 py-2 rounded border text-center text-xs transition-colors select-none',
                        isOver && 'border-gold bg-gold/10',
                        player
                          ? 'bg-navy-700 border-navy-600 cursor-grab'
                          : 'bg-navy-900 border-dashed border-navy-600'
                      )}
                      draggable={!!player}
                      onDragStart={player ? (e) => handleSlotDragStart(e, slot) : undefined}
                      onDragEnd={player ? handleDragEnd : undefined}
                    >
                      {player ? (
                        <>
                          <div className="text-white font-medium truncate">{player.name.split(' ').pop()}</div>
                          {player.jersey_number && <div className="text-[9px] text-muted">#{player.jersey_number}</div>}
                        </>
                      ) : (
                        <span className="text-navy-600">{slot.slot_label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {editLayout && (
            <p className="text-[10px] text-navy-600">Drag slots to reposition. Sub slots are fixed at the bottom.</p>
          )}
        </div>
      </div>
    </div>
  );
}
