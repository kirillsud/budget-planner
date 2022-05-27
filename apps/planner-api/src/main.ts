import * as express from 'express';
import * as cors from 'cors';
import { isCelebrateError } from 'celebrate';
import { auth } from './app/middleware/auth';
import { error } from './app/middleware/error';
import authRouter from './app/routes/auth.routes';
import budgetRouter from './app/routes/budget.routes';

import { PORT, CLIENT_URL } from './app/utils/config';

const app = express();

app.use(
  cors({
    origin: CLIENT_URL.split(','),
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/ping', async (req, res) => {
  res.send('Server works!');
});

app.use(authRouter);

app.use(auth, budgetRouter);

app.use(error);

const server = app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}/api`);
});

server.on('error', console.error);
