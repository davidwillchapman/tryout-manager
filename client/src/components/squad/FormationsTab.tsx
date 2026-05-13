import { useState } from 'react';
import { Plus, Star, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent } from '../ui/Dialog';
import { FormationCanvas } from './FormationCanvas';
import {
  useFormations,
  useCreateFormation,
  useSetDefaultFormation,
  useDeleteFormation,
  useFormationTemplates,
} from '../../api/squad';
import { cn } from '../../lib/utils';

interface Props {
  teamId: number;
}

export function FormationsTab({ teamId }: Props) {
  const { data: formations = [] } = useFormations(teamId);
  const { data: templates = [] } = useFormationTemplates();
  const createFormation = useCreateFormation(teamId);
  const setDefault = useSetDefaultFormation(teamId);
  const deleteFormation = useDeleteFormation(teamId);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplateId, setNewTemplateId] = useState<number | null>(null);
  const [selectedFormationId, setSelectedFormationId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Default to first template when dialog opens and templates are loaded
  const defaultTemplateId = templates[0]?.id ?? null;
  const effectiveTemplateId = newTemplateId ?? defaultTemplateId;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !effectiveTemplateId) return;
    createFormation.mutate(
      { name: newName.trim(), template_id: effectiveTemplateId },
      {
        onSuccess: (f) => {
          setSelectedFormationId(f.id);
          setNewName('');
          setNewTemplateId(null);
          setNewOpen(false);
        },
      }
    );
  }

  const selectedFormation = formations.find((f) => f.id === selectedFormationId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
          {/* Formations list */}
          <div className="w-56 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-navy-700 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Formations</span>
              <button
                onClick={() => setNewOpen(true)}
                className="text-muted hover:text-gold transition-colors"
                title="New Formation"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {formations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted text-xs px-3 text-center">
                  No formations yet.<br />
                  <button onClick={() => setNewOpen(true)} className="text-gold hover:underline mt-1">Create one</button>
                </div>
              ) : (
                formations.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border-b border-navy-800 cursor-pointer transition-colors group',
                      selectedFormationId === f.id ? 'bg-navy-700' : 'hover:bg-navy-800'
                    )}
                    onClick={() => setSelectedFormationId(f.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{f.name}</p>
                      <span className="text-[10px] text-muted border border-navy-600 px-1 rounded">{f.formation_code}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {f.is_default && <Star size={11} className="text-gold fill-gold" />}
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                        {!f.is_default && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDefault.mutate(f.id); }}
                            title="Set as default"
                            className="text-muted hover:text-gold p-0.5"
                          >
                            <Star size={11} />
                          </button>
                        )}
                        {confirmDeleteId === f.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFormation.mutate(f.id, {
                                  onSuccess: () => {
                                    setConfirmDeleteId(null);
                                    if (selectedFormationId === f.id) setSelectedFormationId(null);
                                  },
                                });
                              }}
                              className="text-red-400 hover:text-red-300 p-0.5 text-[10px]"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="text-muted hover:text-white p-0.5 text-[10px]"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); }}
                            className="text-muted hover:text-red-400 p-0.5"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <ChevronRight size={12} className="text-navy-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden">
            {selectedFormation ? (
              <FormationCanvas key={selectedFormation.id} teamId={teamId} formationId={selectedFormation.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted text-sm gap-2">
                <p>Select a formation to edit</p>
                {formations.length === 0 && (
                  <Button size="sm" onClick={() => setNewOpen(true)}><Plus size={12} /> New Formation</Button>
                )}
              </div>
            )}
          </div>
        </div>

      {/* New Formation dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => !v && setNewOpen(false)}>
        <DialogContent title="New Formation">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Main Formation"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Template</label>
              <select
                value={effectiveTemplateId ?? ''}
                onChange={(e) => setNewTemplateId(Number(e.target.value) || null)}
                className="w-full h-9 rounded border border-navy-600 bg-navy-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                {templates.length === 0 && <option value="">No templates available</option>}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.is_builtin ? ' (built-in)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={!newName.trim() || !effectiveTemplateId || createFormation.isPending}>
                {createFormation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
