import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent } from '../ui/Dialog';
import { FormationTemplateEditor } from './FormationTemplateEditor';
import {
  useFormationTemplates,
  useFormationTemplate,
  useCreateFormationTemplate,
  useUpdateFormationTemplate,
  useDeleteFormationTemplate,
} from '../../api/squad';
import { FORMATION_TEMPLATES } from '../../lib/formations';
import { cn } from '../../lib/utils';

export function FormationTemplateManager() {
  const { data: templates = [], isLoading } = useFormationTemplates();
  const createTemplate = useCreateFormationTemplate();
  const updateTemplate = useUpdateFormationTemplate();
  const deleteTemplate = useDeleteFormationTemplate();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCopyCode, setNewCopyCode] = useState<string>('');

  const { data: selectedTemplate } = useFormationTemplate(selectedId ?? 0);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const baseSlots = newCopyCode
      ? FORMATION_TEMPLATES[newCopyCode as keyof typeof FORMATION_TEMPLATES] ?? []
      : [];

    const slots = baseSlots.map(({ slot_label, role, x_pct, y_pct }) => ({ slot_label, role, x_pct, y_pct }));
    if (slots.length === 0) {
      slots.push({ slot_label: 'GK', role: 'starter', x_pct: 50, y_pct: 88 });
    }

    createTemplate.mutate(
      { name: newName.trim(), slots },
      {
        onSuccess: (t) => {
          setSelectedId(t.id);
          setNewName('');
          setNewCopyCode('');
          setNewOpen(false);
        },
      }
    );
  }

  function handleSave(name: string, slots: { slot_label: string; role: 'starter' | 'first_sub'; x_pct: number; y_pct: number }[]) {
    if (!selectedId) return;
    updateTemplate.mutate({ id: selectedId, name, slots });
  }

  function handleDelete(id: number) {
    deleteTemplate.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        if (selectedId === id) setSelectedId(null);
      },
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Template list */}
      <div className="w-56 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-navy-700 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Templates</span>
          <button
            onClick={() => setNewOpen(true)}
            className="text-muted hover:text-gold transition-colors"
            title="New Template"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted text-xs">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted text-xs px-3 text-center">
              No templates yet.<br />
              <button onClick={() => setNewOpen(true)} className="text-gold hover:underline mt-1">Create one</button>
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 border-b border-navy-800 cursor-pointer transition-colors group',
                  selectedId === t.id ? 'bg-navy-700' : 'hover:bg-navy-800'
                )}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.name}</p>
                  <span className="text-[10px] text-muted">
                    {t.is_builtin ? 'built-in' : `${t.slot_count ?? 0} slots`}
                  </span>
                </div>
                {!t.is_builtin && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                    {confirmDeleteId === t.id ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          className="text-red-400 hover:text-red-300 p-0.5 text-[10px]"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="text-muted hover:text-white p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }}
                        className="text-muted hover:text-red-400 p-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 overflow-hidden relative">
        {selectedTemplate ? (
          <FormationTemplateEditor
            key={selectedTemplate.id}
            template={selectedTemplate}
            readOnly={selectedTemplate.is_builtin}
            onSave={handleSave}
            isSaving={updateTemplate.isPending}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted text-sm gap-2">
            <p>Select a template to view or edit</p>
            <Button size="sm" onClick={() => setNewOpen(true)}><Plus size={12} /> New Template</Button>
          </div>
        )}
      </div>

      {/* New Template dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => !v && setNewOpen(false)}>
        <DialogContent title="New Template">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My 4-3-3 Variant"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Copy slots from (optional)</label>
              <select
                value={newCopyCode}
                onChange={(e) => setNewCopyCode(e.target.value)}
                className="w-full h-9 rounded border border-navy-600 bg-navy-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">— start empty —</option>
                {Object.keys(FORMATION_TEMPLATES).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={!newName.trim() || createTemplate.isPending}>
                {createTemplate.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
