import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppShell } from './components/layout/AppShell';
import { PlayersPage } from './pages/PlayersPage';
import { GroupsPage } from './pages/GroupsPage';
import { TeamsPage } from './pages/TeamsPage';
import { LeagueResultsPage } from './pages/LeagueResultsPage';
import { LeagueDivisionsPage } from './pages/LeagueDivisionsPage';
import { LeagueStandingsPage } from './pages/LeagueStandingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/players" replace />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/groups"  element={<GroupsPage />} />
            <Route path="/teams"   element={<TeamsPage />} />
            <Route path="/league-results" element={<LeagueResultsPage />} />
            <Route path="/league-results/:seasonId" element={<LeagueDivisionsPage />} />
            <Route path="/league-results/:seasonId/:divisionId" element={<LeagueStandingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
