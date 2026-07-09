import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-navy-950">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <div className="h-16 shrink-0 border-t border-navy-800 bg-navy-900" />
    </div>
  );
}
