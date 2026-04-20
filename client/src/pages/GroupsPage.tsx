import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { GroupCard } from '../components/groups/GroupCard';
import { GroupForm } from '../components/groups/GroupForm';
import { useGroups, useCreateGroup } from '../api/groups';

export function GroupsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: groups = [], isLoading } = useGroups();
  const createGroup = useCreateGroup();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-sm text-muted mt-0.5">Tryout pools &amp; evaluation groups</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">No groups yet. Create a group to start organizing players.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent title="New Group">
          <GroupForm
            onSubmit={(data) => createGroup.mutate(data, { onSuccess: () => setModalOpen(false) })}
            onCancel={() => setModalOpen(false)}
            isLoading={createGroup.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
