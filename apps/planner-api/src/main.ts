import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import { BudgetRecord } from '@planner/budget-domain';
import { auth, AuthRequest } from './app/middleware/auth';
import { generateJwt } from './app/utils/jwt';
import { HttpError } from './app/errors/http.error';
import { LegacyApi } from './app/utils/legacy-api';
import { catchAsync } from './app/utils/express';

const {
  PORT = 3333,
  API_URL = 'http://planner.bigmilk.ru/api',
  CLIENT_URL = 'http://localhost:4200',
} = process.env;

const legacyApi = new LegacyApi(API_URL);

const app = express();

app.use(cors({
  origin: CLIENT_URL.split(','),
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/ping', async (req, res) => {
  res.send('Server works!');
});

app.post('/api/auth/login', catchAsync(async (req, res) => {
  const token = await legacyApi.login(req.body.email, req.body.password, req.body.remember);
  const jwt = generateJwt(token);

  res.send({ jwt });
}));

app.get('/api/auth/logout', auth, catchAsync(async (req: AuthRequest, res) => {
  await legacyApi.logout(req.auth);
  res.send();
}));

app.get('/api/income', auth, catchAsync(async (req: AuthRequest, res) => {
  const expenses: BudgetRecord[] = await legacyApi.getIncomes(req.auth);
  res.send(expenses);
}));

app.get('/api/expense', auth, catchAsync(async (req: AuthRequest, res) => {
  const expenses: BudgetRecord[] = await legacyApi.getExpenses(req.auth);
  res.send(expenses);
}));

app.use((error: unknown | HttpError, _req, res, next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : error.toString();

  console.log(error);

  res
    .status(statusCode)
    .send({ message });

  next();
});

const server = app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}/api`);
});

server.on('error', console.error);
