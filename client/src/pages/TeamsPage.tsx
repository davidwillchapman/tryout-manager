import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Dialog, DialogContent } from "../components/ui/Dialog";
import { Select, SelectItem } from "../components/ui/Select";
import { TeamCard } from "../components/teams/TeamCard";
import { TeamForm } from "../components/teams/TeamForm";
import { useTeams, useCreateTeam } from "../api/teams";
import { useGroups } from "../api/groups";

export function TeamsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState("");
  const { data: groups = [] } = useGroups();
  const { data: teams = [], isLoading } = useTeams(
    groupFilter ? parseInt(groupFilter) : undefined,
  );
  const createTeam = useCreateTeam();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-sm text-muted mt-0.5">Final team assignments</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Team
        </Button>
      </div>

      <div className="mb-4 w-48">
        <Select
          value={groupFilter}
          onValueChange={setGroupFilter}
          placeholder="All groups"
        >
          <SelectItem value="All">All groups</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id.toString()}>
              {g.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">
            {groupFilter
              ? "No teams in this group."
              : "No teams yet. Create a team to start assigning players."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent title="New Team">
          <TeamForm
            onSubmit={(data) =>
              createTeam.mutate(data, { onSuccess: () => setModalOpen(false) })
            }
            onCancel={() => setModalOpen(false)}
            isLoading={createTeam.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
