import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import taskRouter from './routes/task.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'Tarefas API',
    status: 'online',
    endpoints: { health: '/api/health', tasks: '/api/tasks' },
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/tasks', taskRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
