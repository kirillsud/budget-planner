import * as express from 'express';
import * as cors from 'cors';
import * as authFeature from '@planner/auth-api';
import * as budgetFeature from '@planner/budget-api';
import { error } from './app/middleware/error';

import { PORT, CLIENT_URL } from '@planner/common-api';

const app = express();

app.use(
  cors({
    origin: CLIENT_URL.split(','),
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/ping', async (_req, res) => {
  res.send('Server works!');
});

app.use('/api/auth', authFeature.router);

app.use('/api/budget', authFeature.guard, budgetFeature.router);

app.use(error);

const server = app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}/api`);
});

server.on('error', console.error);
