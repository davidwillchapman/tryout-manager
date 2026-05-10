import { useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useFrameworks, useFramework } from '../../api/frameworks';
import { useAddTag } from '../../api/activities';
import type { FrameworkSection } from '../../types';

interface TagFormProps {
  activityId: number;
  open: boolean;
  onClose: () => void;
}

function getTopLevel(sections: FrameworkSection[]): FrameworkSection[] {
  return sections.filter((s) => s.parent_id == null);
}

function getChildren(sections: FrameworkSection[], parentId: number): FrameworkSection[] {
  return sections.filter((s) => s.parent_id === parentId);
}

function flattenSections(sections: FrameworkSection[]): FrameworkSection[] {
  const result: FrameworkSection[] = [];
  function walk(nodes: FrameworkSection[]) {
    for (const n of nodes) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(sections);
  return result;
}

export function TagForm({ activityId, open, onClose }: TagFormProps) {
  const [frameworkId, setFrameworkId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [principleId, setPrincipleId] = useState('');
  const [subPrincipleId, setSubPrincipleId] = useState('');

  const { data: frameworks = [] } = useFrameworks();
  const { data: fwDetail } = useFramework(frameworkId ? Number(frameworkId) : 0);
  const addTag = useAddTag();

  const flatSections = fwDetail ? flattenSections(fwDetail.sections ?? []) : [];
  const phases = fwDetail ? getTopLevel(flatSections) : [];
  const principles = phaseId ? getChildren(flatSections, Number(phaseId)) : [];
  const subPrinciples = principleId ? getChildren(flatSections, Number(principleId)) : [];

  const handleFrameworkChange = (v: string) => {
    setFrameworkId(v);
    setPhaseId('');
    setPrincipleId('');
    setSubPrincipleId('');
  };

  const handlePhaseChange = (v: string) => {
    setPhaseId(v);
    setPrincipleId('');
    setSubPrincipleId('');
  };

  const handlePrincipleChange = (v: string) => {
    setPrincipleId(v);
    setSubPrincipleId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frameworkId) return;
    addTag.mutate(
      {
        activityId,
        framework_id: Number(frameworkId),
        phase_section_id: phaseId ? Number(phaseId) : null,
        principle_section_id: principleId ? Number(principleId) : null,
        sub_principle_section_id: subPrincipleId ? Number(subPrincipleId) : null,
      },
      {
        onSuccess: () => {
          setFrameworkId(''); setPhaseId(''); setPrincipleId(''); setSubPrincipleId('');
          onClose();
        },
      }
    );
  };

  const selectClass = 'flex h-9 w-full rounded border border-navy-600 bg-navy-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-40';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Add DNA Tag">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Framework *</label>
            <select value={frameworkId} onChange={(e) => handleFrameworkChange(e.target.value)} className={selectClass} required>
              <option value="">— Select framework —</option>
              {frameworks.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Phase</label>
            <select value={phaseId} onChange={(e) => handlePhaseChange(e.target.value)} className={selectClass} disabled={!frameworkId}>
              <option value="">— None —</option>
              {phases.map((s) => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Principle</label>
            <select value={principleId} onChange={(e) => handlePrincipleChange(e.target.value)} className={selectClass} disabled={!phaseId}>
              <option value="">— None —</option>
              {principles.map((s) => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Sub-Principle</label>
            <select value={subPrincipleId} onChange={(e) => setSubPrincipleId(e.target.value)} className={selectClass} disabled={!principleId}>
              <option value="">— None —</option>
              {subPrinciples.map((s) => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
            </select>
          </div>

          {addTag.isError && (
            <p className="text-xs text-red-400">{String((addTag.error as Error).message)}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!frameworkId || addTag.isPending}>
              {addTag.isPending ? 'Adding…' : 'Add Tag'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
