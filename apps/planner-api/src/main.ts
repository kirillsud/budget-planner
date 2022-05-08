import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import axios from 'axios';
import * as FormData from 'form-data';
import { BudgetRecord } from '@planner/budget-domain';
import { auth, AuthRequest, AuthToken } from './app/middleware/auth';
import { generateJwt } from './app/utils/jwt';
import { HttpError } from './app/errors/http.error';
import { AuthorizationError } from './app/errors/authorization.error';

const {
  PORT = 3333,
  API_URL = 'http://planner.bigmilk.ru/api',
} = process.env;

interface ApiIncome {
  id: number;
  date_from: number;
  date_to: number;
  label: string;
  amount: number;
  completed: boolean;
}

interface ApiGoal {
  id: number;
  date: number;
  label: string;
  amount: number;
  completed: boolean;
}

type ApiResponse = Record<number, ApiResponseDay>;

interface ApiResponseDay {
  incomes?: ApiIncome[];
  goals?: ApiGoal[];
}

const app = express();

app.use(cors({
  origin: ['http://localhost:4200'],
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/ping', async (req, res) => {
  res.send('Server works!');
});

app.post('/api/auth', async (req, res, next) => {
  const form = new FormData();

  form.append('email', req.body.email);
  form.append('password', req.body.password);
  form.append('remember', req.body.remember ? 'on' : 'off');

  const apiResponse = await axios({
    method: 'post',
    url: `${API_URL}/auth.php`,
    headers: {
      ...form.getHeaders()
    },
    data: form,
  });

  const data = apiResponse.data;

  if (data === -3) {
    next(new AuthorizationError());
    return;
  }

  const token = generateJwt(data);

  res.send({ jwt: token });
});

app.get('/api/income', auth, async (req: AuthRequest, res) => {
  const expenses: BudgetRecord[] = await loadRecords(req.auth, 'income');
  res.send(expenses);
});

app.get('/api/expense', auth, async (req: AuthRequest, res) => {
  const expenses: BudgetRecord[] = await loadRecords(req.auth, 'expense');
  res.send(expenses);
});

app.use((error: unknown | HttpError, _req, res, next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : error.toString();

  console.log(error);

  res
    .status(statusCode)
    .send({message});

  next();
});

const server = app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}/api`);
});

server.on('error', console.error);

async function loadRecords(auth: AuthToken, type: BudgetRecord['type']): Promise<BudgetRecord[]> {
  const cookies = `PHPSESSID=${auth.session}; auth_series=${auth.series}; auth_token=${auth.token}`;

  const apiResponse = await axios({
    method: 'get',
    url: `${API_URL}/`,
    headers: {
      'Cookie': cookies
    }
  });

  const apiType = 'income' === type ? 'incoming' : 'goals';
  
  const dates: ApiResponse = apiResponse.data;

  const records: BudgetRecord[] = Object
    .values(dates)
    .reduce((acc, day) => [...acc, ...(day[apiType] ?? [])], [])
    .map(x => convertApiRecordToPublic(x, type));
    
  return records;
}

function convertApiRecordToPublic(value: ApiIncome | ApiGoal, type: BudgetRecord['type']): BudgetRecord {
  let dateFrom: Date;
  
  if ('date_from' in value) {
    dateFrom = timestampToDate(value.date_from);
  }
  
  if ('date' in value) {
    dateFrom = timestampToDate(value.date);
  }

  if (!dateFrom) {
    throw new Error('Date is not defined');
  }

  let dateTo: Date | undefined;
  
  if ('date_to' in value) {
    dateTo = timestampToDate(value.date_to);
  }

  return {
    type,
    id: value.id,
    title: value.label,
    date: {
      from: dateFrom,
      to: dateTo,
    },
    amount: value.amount,
    completed: value.completed,
  };
}

function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
