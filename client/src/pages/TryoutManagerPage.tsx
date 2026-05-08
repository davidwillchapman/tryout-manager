import { Link } from 'react-router-dom';

export function TryoutManagerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Tryout Manager</h1>
      <p className="text-muted mt-1 text-sm mb-6">Evaluate players, build groups, and assemble teams.</p>
      <div className="flex flex-col gap-2 max-w-xs">
        <Link to="/players" className="px-4 py-2.5 rounded bg-navy-800 text-white text-sm hover:bg-navy-700 transition-colors">Players</Link>
        <Link to="/groups"  className="px-4 py-2.5 rounded bg-navy-800 text-white text-sm hover:bg-navy-700 transition-colors">Groups</Link>
        <Link to="/teams"   className="px-4 py-2.5 rounded bg-navy-800 text-white text-sm hover:bg-navy-700 transition-colors">Teams</Link>
      </div>
    </div>
  );
}
