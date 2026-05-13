import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import type { FormationTemplate, FormationTemplateSlot } from '../../types';

interface Props {
  template: FormationTemplate;
  readOnly?: boolean;
  onSave: (name: string, slots: Omit<FormationTemplateSlot, 'id' | 'formation_template_id'>[]) => void;
  isSaving?: boolean;
}

type LocalSlot = Omit<FormationTemplateSlot, 'id' | 'formation_template_id'> & { localId: string };

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

function toLocalSlots(slots: FormationTemplateSlot[]): LocalSlot[] {
  return slots.map((s, i) => ({
    localId: `${s.id ?? i}-${s.slot_label}`,
    slot_label: s.slot_label,
    role: s.role,
    x_pct: s.x_pct,
    y_pct: s.y_pct,
  }));
}

export function FormationTemplateEditor({ template, readOnly = false, onSave, isSaving }: Props) {
  const [name, setName] = useState(template.name);
  const [slots, setSlots] = useState<LocalSlot[]>(() => toLocalSlots(template.slots ?? []));
  const [savedSlots] = useState<LocalSlot[]>(() => toLocalSlots(template.slots ?? []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<'starter' | 'first_sub'>('starter');

  const fieldRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ localId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const isDirty =
    name !== template.name ||
    slots.length !== savedSlots.length ||
    slots.some((s, i) => {
      const o = savedSlots[i];
      return !o || s.slot_label !== o.slot_label || s.role !== o.role || s.x_pct !== o.x_pct || s.y_pct !== o.y_pct;
    });

  function handleReset() {
    setName(template.name);
    setSlots(toLocalSlots(template.slots ?? []));
  }

  function handleSave() {
    onSave(name, slots.map(({ slot_label, role, x_pct, y_pct }) => ({ slot_label, role, x_pct, y_pct })));
  }

  function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const newSlot: LocalSlot = {
      localId: `new-${Date.now()}`,
      slot_label: newLabel.trim().toUpperCase(),
      role: newRole,
      x_pct: 50,
      y_pct: 50,
    };
    setSlots((prev) => [...prev, newSlot]);
    setNewLabel('');
    setAddOpen(false);
  }

  function handleRemoveSlot(localId: string) {
    setSlots((prev) => prev.filter((s) => s.localId !== localId));
    if (selectedId === localId) setSelectedId(null);
  }

  const pointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    const newX = Math.max(0, Math.min(100, draggingRef.current.origX + (dx / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, draggingRef.current.origY + (dy / rect.height) * 100));
    setSlots((prev) =>
      prev.map((s) =>
        s.localId === draggingRef.current!.localId ? { ...s, x_pct: Math.round(newX * 10) / 10, y_pct: Math.round(newY * 10) / 10 } : s
      )
    );
  }, []);

  const pointerUp = useCallback(() => {
    draggingRef.current = null;
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
  }, [pointerMove]);

  function handleSlotPointerDown(e: React.PointerEvent, slot: LocalSlot) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(slot.localId);
    draggingRef.current = {
      localId: slot.localId,
      startX: e.clientX,
      startY: e.clientY,
      origX: slot.x_pct,
      origY: slot.y_pct,
    };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
  }

  const starterSlots = slots.filter((s) => s.role === 'starter');
  const subSlots = slots.filter((s) => s.role === 'first_sub');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-700 shrink-0 flex-wrap gap-y-2">
        {readOnly ? (
          <span className="text-sm font-semibold text-white">{name}</span>
        ) : (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm font-semibold text-white bg-transparent border-b border-navy-600 outline-none focus:border-gold w-40"
            disabled={readOnly}
          />
        )}
        {template.is_builtin && (
          <span className="text-[10px] text-muted border border-navy-600 px-1.5 rounded">built-in</span>
        )}
        {!readOnly && (
          <button
            onClick={() => setAddOpen(true)}
            className="text-xs text-muted hover:text-gold flex items-center gap-1 border border-navy-600 px-2 py-1 rounded transition-colors"
          >
            <Plus size={11} /> Add Slot
          </button>
        )}
        {selectedId && !readOnly && (
          <button
            onClick={() => handleRemoveSlot(selectedId)}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-900 px-2 py-1 rounded transition-colors"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
        {!readOnly && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty}>
              <RotateCcw size={12} /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
              <Save size={12} /> {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col items-center gap-4">
        {/* Field + starters */}
        <div className="w-full max-w-xs">
          <div
            ref={fieldRef}
            className="relative rounded border border-navy-600 overflow-hidden select-none"
            style={{ paddingBottom: '150%' }}
          >
            <SoccerFieldSVG />
            {starterSlots.map((slot) => {
              const isSelected = selectedId === slot.localId;
              return (
                <div
                  key={slot.localId}
                  style={{ left: `${slot.x_pct}%`, top: `${slot.y_pct}%`, transform: 'translate(-50%, -50%)' }}
                  className={cn(
                    'absolute w-10 h-10 rounded-full flex items-center justify-center border-2 text-center',
                    readOnly
                      ? 'border-white/20 bg-white/10 cursor-default'
                      : 'cursor-grab active:cursor-grabbing',
                    !readOnly && isSelected ? 'border-gold bg-gold/20' : !readOnly ? 'border-blue-400/60 bg-navy-700' : ''
                  )}
                  onPointerDown={(e) => handleSlotPointerDown(e, slot)}
                  onClick={() => !readOnly && setSelectedId(slot.localId)}
                >
                  <span className="text-[9px] text-white font-semibold leading-tight text-center px-0.5">
                    {slot.slot_label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub slots */}
        {subSlots.length > 0 && (
          <div className="w-full max-w-xs">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-2">First Subs</p>
            <div className="flex gap-2 flex-wrap">
              {subSlots.map((slot) => {
                const isSelected = selectedId === slot.localId;
                return (
                  <div
                    key={slot.localId}
                    onClick={() => !readOnly && setSelectedId(slot.localId)}
                    className={cn(
                      'flex-1 min-w-[56px] px-2 py-2 rounded border text-center text-xs select-none',
                      readOnly ? 'bg-navy-900 border-navy-600 cursor-default' : 'cursor-pointer',
                      !readOnly && isSelected ? 'border-gold bg-gold/10' : !readOnly ? 'bg-navy-800 border-navy-600' : ''
                    )}
                  >
                    <span className="text-white/70">{slot.slot_label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!readOnly && (
          <p className="text-[10px] text-navy-600">
            {readOnly ? '' : 'Drag slots to reposition. Click to select, then Remove to delete.'}
          </p>
        )}
      </div>

      {/* Add slot popover */}
      {addOpen && (
        <div className="absolute bottom-4 right-4 z-10 bg-navy-800 border border-navy-600 rounded shadow-xl p-3 w-56">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Add Slot</span>
            <button onClick={() => setAddOpen(false)} className="text-muted hover:text-white">
              <X size={12} />
            </button>
          </div>
          <form onSubmit={handleAddSlot} className="space-y-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. ST)"
              className="h-7 text-xs"
              autoFocus
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'starter' | 'first_sub')}
              className="w-full h-7 text-xs rounded border border-navy-600 bg-navy-900 px-2 text-white focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="starter">Starter</option>
              <option value="first_sub">First Sub</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1" disabled={!newLabel.trim()}>Add</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
