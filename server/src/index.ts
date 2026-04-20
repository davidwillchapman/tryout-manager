import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import groupsRouter from './routes/groups';
import teamsRouter from './routes/teams';
import playersRouter from './routes/players';
import errorHandler from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/groups', groupsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);

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
