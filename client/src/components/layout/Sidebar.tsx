import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import logo from '../../assets/logo-white.png';

type NavItem = {
  key: string;
  label: string;
  to: string;
  children?: { label: string; to: string }[];
};

const navItems: NavItem[] = [
  { key: 'playmaker',      label: 'Playmaker',       to: '/playmaker' },
  { key: 'squad-assist',   label: 'Squad Assist',    to: '/squad-assist' },
  {
    key: 'tryout-manager',
    label: 'Tryout Manager',
    to: '/tryout-manager',
    children: [
      { label: 'Players', to: '/players' },
      { label: 'Groups',  to: '/groups' },
      { label: 'Teams',   to: '/teams' },
    ],
  },
  {
    key: 'league-results',
    label: 'League Results',
    to: '/league-results',
    children: [
      { label: 'Standings', to: '/league-results' },
    ],
  },
];

function childRoutes(item: NavItem): string[] {
  return item.children?.map((c) => c.to) ?? [];
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleItemClick = (item: NavItem) => {
    const next: Record<string, boolean> = {};
    if (item.children) {
      next[item.key] = true;
    }
    setExpanded(next);
    navigate(item.to);
  };

  const handleArrowClick = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-56 shrink-0 bg-navy-900 border-r border-navy-600 flex flex-col">
      <div className="px-5 py-4 border-b border-navy-600">
        <img
          src={logo}
          alt="Sideline Kick"
          className="h-16 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const isExpanded = !!expanded[item.key];
          const childPaths = childRoutes(item);
          const activeInSubtree =
            location.pathname === item.to ||
            childPaths.some((p) => location.pathname.startsWith(p));

          return (
            <div key={item.key}>
              <div
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex items-center justify-between px-5 py-2.5 text-sm cursor-pointer transition-colors duration-150',
                  activeInSubtree
                    ? 'text-gold border-l-2 border-gold bg-navy-800 -ml-px pl-[19px]'
                    : 'text-muted hover:text-white hover:bg-navy-800'
                )}
              >
                <span>{item.label}</span>
                {item.children && (
                  <span
                    onClick={(e) => handleArrowClick(e, item.key)}
                    className="p-0.5 rounded hover:bg-navy-700"
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </span>
                )}
              </div>

              {item.children && isExpanded && (
                <div className="ml-4 border-l border-navy-600">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to + child.label}
                      to={child.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-4 py-2 text-sm transition-colors duration-150',
                          isActive
                            ? 'text-gold bg-navy-800'
                            : 'text-muted hover:text-white hover:bg-navy-800'
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
