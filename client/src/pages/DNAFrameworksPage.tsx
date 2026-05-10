import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Plus, Upload, Trash2, ChevronRight, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import {
  useFrameworks,
  useFramework,
  useCreateFramework,
  useImportFramework,
  useUpdateFramework,
  useDeleteFramework,
  useAddSection,
  useUpdateSection,
  useDeleteSection,
} from '../api/frameworks';
import type { Framework, FrameworkSection } from '../types';
import { cn } from '../lib/utils';

// ─── Section Tree ───────────────────────────────────────────────────────────

interface SectionNodeProps {
  section: FrameworkSection;
  frameworkId: number;
  selectedId: number | null;
  onSelect: (s: FrameworkSection) => void;
  depth?: number;
}

function SectionNode({ section, frameworkId, selectedId, onSelect, depth = 0 }: SectionNodeProps) {
  const [open, setOpen] = useState(false);
  const deleteSection = useDeleteSection();
  const hasChildren = section.children && section.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group text-sm',
          selectedId === section.id
            ? 'bg-navy-700 text-white'
            : 'text-muted hover:text-white hover:bg-navy-800'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(section)}
      >
        <span
          className="shrink-0 w-4 h-4 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        >
          {hasChildren
            ? open
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            : <span className="w-3 h-3 rounded-full border border-navy-600 inline-block" />}
        </span>
        <span className="flex-1 truncate">{section.title}</span>
        <button
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-0.5 rounded"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${section.title}" and all its sub-sections?`)) {
              deleteSection.mutate({ frameworkId, sectionId: section.id });
            }
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      {hasChildren && open && (
        <div>
          {section.children!.map((child) => (
            <SectionNode
              key={child.id}
              section={child}
              frameworkId={frameworkId}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Edit Form ───────────────────────────────────────────────────────

interface SectionEditFormProps {
  section: FrameworkSection;
  frameworkId: number;
  onDone: () => void;
}

function SectionEditForm({ section, frameworkId, onDone }: SectionEditFormProps) {
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content ?? '');
  const updateSection = useUpdateSection();

  const handleSave = () => {
    updateSection.mutate(
      { frameworkId, sectionId: section.id, title, content: content || null, parent_id: section.parent_id, order_index: section.order_index },
      { onSuccess: onDone }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-base font-semibold" />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        placeholder="Section content (markdown supported)..."
        className="font-mono text-xs"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X size={12} /> Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={handleSave} disabled={updateSection.isPending}>
          <Check size={12} /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Section View ────────────────────────────────────────────────────────────

interface SectionViewProps {
  section: FrameworkSection;
  frameworkId: number;
  onSelectChild: (s: FrameworkSection) => void;
}

function SectionView({ section, frameworkId, onSelectChild }: SectionViewProps) {
  const [editing, setEditing] = useState(false);

  // Sync editing state off when section changes
  const [lastSectionId, setLastSectionId] = useState(section.id);
  if (section.id !== lastSectionId) {
    setLastSectionId(section.id);
    setEditing(false);
  }

  const hasChildren = section.children && section.children.length > 0;

  if (editing) {
    return (
      <SectionEditForm
        section={section}
        frameworkId={frameworkId}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-white leading-tight">{section.title}</h3>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="shrink-0">
          <Edit2 size={12} /> Edit
        </Button>
      </div>

      {section.content && (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>
      )}

      {!section.content && !hasChildren && (
        <p className="text-muted italic text-sm">No content — click Edit to add.</p>
      )}

      {hasChildren && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Sub-sections</p>
          {section.children!.map((child) => {
            const firstLine = child.content?.split('\n').find((l) => l.trim()) ?? '';
            const preview = firstLine.replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 120);
            return (
              <button
                key={child.id}
                onClick={() => onSelectChild(child)}
                className="text-left bg-navy-800 border border-navy-700 rounded p-3 hover:border-gold hover:bg-navy-700 transition-colors group"
              >
                <p className="text-sm font-medium text-white group-hover:text-gold transition-colors">{child.title}</p>
                {preview && <p className="text-xs text-muted mt-0.5 truncate">{preview}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Framework Metadata Editor ───────────────────────────────────────────────

interface MetaEditorProps {
  framework: Framework;
}

function MetaEditor({ framework }: MetaEditorProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(framework.name);
  const [source, setSource] = useState(framework.source ?? '');
  const [version, setVersion] = useState(framework.version ?? '');
  const [description, setDescription] = useState(framework.description ?? '');
  const update = useUpdateFramework();

  const handleSave = () => {
    update.mutate(
      { id: framework.id, name, source: source || null, version: version || null, description: description || null },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleCancel = () => {
    setName(framework.name);
    setSource(framework.source ?? '');
    setVersion(framework.version ?? '');
    setDescription(framework.description ?? '');
    setEditing(false);
  };

  return (
    <div className="border-b border-navy-700 pb-4 mb-4">
      {editing ? (
        <div className="flex flex-col gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Framework name" />
          <div className="flex gap-2">
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (e.g. US Soccer)" />
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version" className="w-32" />
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description" />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{framework.name}</h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
              {framework.source && <span>{framework.source}</span>}
              {framework.version && <span className="border border-navy-600 rounded px-1.5 py-0.5">{framework.version}</span>}
            </div>
            {framework.description && <p className="text-sm text-gray-400 mt-1">{framework.description}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 size={12} /> Edit
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Add Section Modal ───────────────────────────────────────────────────────

interface AddSectionModalProps {
  frameworkId: number;
  sections: FrameworkSection[];
  open: boolean;
  onClose: () => void;
}

function flattenForSelect(sections: FrameworkSection[], depth = 0): { id: number; label: string }[] {
  const result: { id: number; label: string }[] = [];
  for (const s of sections) {
    result.push({ id: s.id, label: `${'—'.repeat(depth)} ${s.title}` });
    if (s.children?.length) result.push(...flattenForSelect(s.children, depth + 1));
  }
  return result;
}

function AddSectionModal({ frameworkId, sections, open, onClose }: AddSectionModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const addSection = useAddSection();

  const flat = flattenForSelect(sections);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSection.mutate(
      { frameworkId, title, content: content || null, parent_id: parentId ? Number(parentId) : null, order_index: 999 },
      {
        onSuccess: () => {
          setTitle(''); setContent(''); setParentId('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Add Section">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Section title" required />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Parent Section</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-9 w-full rounded border border-navy-600 bg-navy-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="">— Top level —</option>
              {flat.map((s) => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Content</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Section content (markdown)..." className="font-mono text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={addSection.isPending}>Add Section</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

function ImportModal({ open, onClose, onCreated }: ImportModalProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importFw = useImportFramework();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', name);
    if (source) fd.append('source', source);
    if (version) fd.append('version', version);
    if (file) fd.append('file', file);
    importFw.mutate(fd, {
      onSuccess: (fw) => {
        setName(''); setSource(''); setVersion(''); setFile(null);
        onCreated(fw.id);
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Import Framework">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. US Soccer Training Framework" required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Source</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. US Soccer Federation" />
            </div>
            <div className="w-28">
              <label className="block text-xs text-muted mb-1">Version</label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 2.0" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">File (.md / .txt)</label>
            <div
              className="flex items-center gap-3 border border-navy-600 rounded px-3 py-2 cursor-pointer hover:border-gold"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} className="text-muted shrink-0" />
              <span className="text-sm text-muted truncate">{file ? file.name : 'Choose file…'}</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted mt-1">Leave empty to create a blank framework.</p>
          </div>
          {importFw.isError && (
            <p className="text-xs text-red-400">{String((importFw.error as Error).message)}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={importFw.isPending}>
              {importFw.isPending ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Framework Modal ──────────────────────────────────────────────────────

interface NewFrameworkModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

function NewFrameworkModal({ open, onClose, onCreated }: NewFrameworkModalProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateFramework();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name, source: source || null, version: version || null, description: description || null },
      {
        onSuccess: (fw) => {
          setName(''); setSource(''); setVersion(''); setDescription('');
          onCreated(fw.id);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="New Framework">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Framework name" required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Source</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. FC Barcelona" />
            </div>
            <div className="w-28">
              <label className="block text-xs text-muted mb-1">Version</label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.0" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  frameworkId: number;
}

function DetailPanel({ frameworkId }: DetailPanelProps) {
  const { data: fw, isLoading } = useFramework(frameworkId);
  const [selectedSection, setSelectedSection] = useState<FrameworkSection | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-muted text-sm">Loading…</div>;
  if (!fw) return null;

  const sections: FrameworkSection[] = fw.sections ?? [];

  // Sync selected section from live data
  const liveSelected = selectedSection
    ? findSection(sections, selectedSection.id)
    : null;

  function findSection(nodes: FrameworkSection[], id: number): FrameworkSection | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findSection(n.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-navy-700 shrink-0">
        <MetaEditor framework={fw} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Section outline */}
        <div className="w-64 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-navy-700">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Sections</span>
            <Button size="sm" variant="ghost" onClick={() => setAddSectionOpen(true)}>
              <Plus size={12} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {sections.length === 0 ? (
              <p className="text-xs text-muted px-3 py-3">No sections yet. Click + to add one.</p>
            ) : (
              sections.map((s) => (
                <SectionNode
                  key={s.id}
                  section={s}
                  frameworkId={fw.id}
                  selectedId={liveSelected?.id ?? null}
                  onSelect={setSelectedSection}
                />
              ))
            )}
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-5">
          {liveSelected ? (
            <SectionView section={liveSelected} frameworkId={fw.id} onSelectChild={setSelectedSection} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpen size={32} className="text-navy-600 mb-3" />
              <p className="text-muted text-sm">Select a section from the outline to view or edit its content.</p>
            </div>
          )}
        </div>
      </div>

      <AddSectionModal
        frameworkId={fw.id}
        sections={sections}
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DNAFrameworksPage() {
  const { data: frameworks = [], isLoading } = useFrameworks();
  const deleteFw = useDeleteFramework();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-64 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden bg-navy-900">
        <div className="px-4 py-4 border-b border-navy-700">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-gold" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">DNA Frameworks</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setImportOpen(true)}>
              <Upload size={12} /> Import
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={() => setNewOpen(true)}>
              <Plus size={12} /> New
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <p className="text-xs text-muted px-4 py-3">Loading…</p>
          ) : frameworks.length === 0 ? (
            <p className="text-xs text-muted px-4 py-3">No frameworks yet. Import or create one.</p>
          ) : (
            frameworks.map((fw) => (
              <div
                key={fw.id}
                onClick={() => setSelectedId(fw.id)}
                className={cn(
                  'group px-4 py-3 cursor-pointer border-l-2 transition-colors',
                  selectedId === fw.id
                    ? 'border-gold bg-navy-800 text-white'
                    : 'border-transparent text-muted hover:bg-navy-800 hover:text-white'
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fw.name}</p>
                    {fw.source && <p className="text-xs text-muted truncate mt-0.5">{fw.source}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {fw.version && (
                        <span className="text-xs border border-navy-600 rounded px-1">{fw.version}</span>
                      )}
                      <span className="text-xs text-muted">{fw.section_count ?? 0} sections</span>
                    </div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-0.5 rounded shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${fw.name}"? This will remove all its sections.`)) {
                        deleteFw.mutate(fw.id, {
                          onSuccess: () => { if (selectedId === fw.id) setSelectedId(null); },
                        });
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden bg-navy-900">
        {selectedId ? (
          <DetailPanel key={selectedId} frameworkId={selectedId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <BookOpen size={48} className="text-navy-700 mb-4" />
            <h2 className="text-white font-semibold mb-1">No Framework Selected</h2>
            <p className="text-muted text-sm">Select a framework from the list, or import / create a new one.</p>
          </div>
        )}
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />
      <NewFrameworkModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />
    </div>
  );
}
