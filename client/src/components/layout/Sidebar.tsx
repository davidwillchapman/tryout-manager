import { NavLink } from 'react-router-dom';
import { Users, Layers, Trophy, Archive } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/players',        label: 'Players',        icon: Users },
  { to: '/groups',         label: 'Groups',          icon: Layers },
  { to: '/teams',          label: 'Teams',           icon: Trophy },
  { to: '/league-results', label: 'League Results',  icon: Archive },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-navy-900 border-r border-navy-600 flex flex-col">
      <div className="px-5 py-5 border-b border-navy-600">
        <span className="text-gold font-bold text-lg tracking-tight">Tryout Manager</span>
      </div>
      <nav className="flex-1 py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                isActive
                  ? 'text-gold border-l-2 border-gold bg-navy-800 -ml-px pl-[19px]'
                  : 'text-muted hover:text-white hover:bg-navy-800'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
