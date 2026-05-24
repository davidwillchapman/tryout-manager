import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import groupsRouter from './routes/groups';
import teamsRouter from './routes/teams';
import playersRouter from './routes/players';
import leagueResultsRouter from './routes/leagueResults';
import frameworksRouter from './routes/frameworks';
import activitiesRouter from './routes/activities';
import sessionsRouter from './routes/sessions';
import squadRouter from './routes/squad';
import errorHandler from './middleware/errorHandler';

const app = express();
const PORT = process.env.SERVER_PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/groups', groupsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/league-results', leagueResultsRouter);
app.use('/api/frameworks', frameworksRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/squad', squadRouter);
app.use('/images', express.static(path.resolve(__dirname, '../../data/images')));
app.use('/videos', express.static(path.resolve(__dirname, '../../data/videos')));

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
