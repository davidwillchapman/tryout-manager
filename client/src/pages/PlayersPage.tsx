import { useRef, useState } from "react";
import { Plus, Search, Upload, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select, SelectItem } from "../components/ui/Select";
import { PlayerRow } from "../components/players/PlayerRow";
import { PlayerModal } from "../components/players/PlayerModal";
import { usePlayers, useImportPlayers, type ImportResult } from "../api/players";
import { useGroups } from "../api/groups";
import { useDebounce } from "../hooks/useDebounce";
import { POSITIONS } from "../lib/positions";
import type { Player } from "../types";

export function PlayersPage() {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: groups = [] } = useGroups();
  const importPlayers = useImportPlayers();

  const { data: rawPlayers = [], isLoading } = usePlayers({
    search: debouncedSearch || undefined,
    position: positionFilter || undefined,
    group_id: groupFilter || undefined,
  });

  const positionOrder = new Map<string, number>(
    POSITIONS.map((p, i) => [p.value, i]),
  );
  const players = [...rawPlayers].sort((a, b) => {
    const ai = positionOrder.get(a.primary_position) ?? POSITIONS.length;
    const bi = positionOrder.get(b.primary_position) ?? POSITIONS.length;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPlayer(undefined);
    setModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setImportResult(null);
    setImportError(null);
    try {
      const text = await file.text();
      const result = await importPlayers.mutateAsync(text);
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-sm text-muted mt-0.5">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importPlayers.isPending}
          >
            <Upload size={16} />
            {importPlayers.isPending ? "Importing..." : "Import CSV"}
          </Button>
          <Button onClick={handleAdd}>
            <Plus size={16} />
            Add Player
          </Button>
        </div>
      </div>

      {(importResult || importError) && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm flex items-start gap-3 ${
            importError
              ? "border-red-700 bg-red-950/30 text-red-200"
              : importResult && importResult.errors.length > 0
                ? "border-yellow-700 bg-yellow-950/30 text-yellow-100"
                : "border-navy-600 bg-navy-800 text-white"
          }`}
        >
          <div className="flex-1">
            {importError ? (
              <p>Import failed: {importError}</p>
            ) : importResult ? (
              <>
                <p>
                  Imported {importResult.imported} player
                  {importResult.imported !== 1 ? "s" : ""}
                  {importResult.errors.length > 0 &&
                    `, ${importResult.errors.length} row${importResult.errors.length !== 1 ? "s" : ""} skipped`}
                  .
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>…and {importResult.errors.length - 10} more</li>
                    )}
                  </ul>
                )}
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setImportError(null);
            }}
            className="text-muted hover:text-white"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="pl-8"
          />
        </div>
        <div className="w-44">
          <Select
            value={positionFilter || "All"}
            onValueChange={(v) => setPositionFilter(v === "All" ? "" : v)}
            placeholder="All positions"
          >
            <SelectItem value="All">All positions</SelectItem>
            {POSITIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.value} – {p.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={groupFilter || "All"}
            onValueChange={(v) => setGroupFilter(v === "All" ? "" : v)}
            placeholder="All groups"
          >
            <SelectItem value="All">All groups</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-navy-600 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading...</div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted text-sm">
              {search || positionFilter || groupFilter
                ? "No players match your filters."
                : "No players yet. Add your first player to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-600 bg-navy-900">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Prior Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  onEdit={handleEdit}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PlayerModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingPlayer(undefined);
        }}
        player={editingPlayer}
      />
    </div>
  );
}
