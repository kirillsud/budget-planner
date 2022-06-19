import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-domain';
import { HttpAuthorizationError } from '../errors/http-authorization.error';
import { HttpNotFoundError } from '../errors/http-not-found.error copy';
import { fromJoiError } from '../errors/http-validation.error';
import { AuthToken } from '../middleware/auth';
import { API_URL } from './config';
import * as Joi from 'joi';

type TimestampInSec = number & { type: 'timestamp-in-sec' };

type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>;

interface ApiRecord {
  id: number;
  label: string;
  amount: number;
  completed: boolean;
}

interface ApiIncomeResponse extends ApiRecord {
  date: TimestampInSec;
}

interface ApiGoalResponse extends ApiRecord {
  date_from: TimestampInSec;
  date_to: TimestampInSec;
}

interface ApiIncomeRequest extends ApiRecord {
  date: string;
}

interface ApiGoalRequest extends ApiRecord {
  date_from: string;
  date_to: string;
}

interface ApiDayRecords {
  incoming?: ApiIncomeResponse[];
  goals?: ApiGoalResponse[];
}

type ApiRecordsByDay = Record<number, ApiDayRecords>;

export class LegacyApi {
  constructor(private readonly url: string) {}

  async login(
    email: string,
    password: string,
    remember: boolean
  ): Promise<AuthToken> {
    const { data } = await axios.postForm<AuthToken | number>(
      `${this.url}/auth.php`,
      {
        email,
        password,
        remember: remember ? 'on' : 'off',
      }
    );

    if (typeof data === 'number') {
      const message = data === -3 ? 'Invalid email or password' : undefined;
      throw new HttpAuthorizationError(message);
    }

    return data;
  }

  async refresh(auth: AuthToken): Promise<AuthToken> {
    const { data } = await this.request<AuthToken | number>(auth, '/auth.php', {
      method: 'post',
      headers: {
        Cookie: `auth_token=${auth.token}; auth_series=${auth.series}`,
      },
    });

    return processLoginResponse(data);
  }

  async logout(auth: AuthToken): Promise<void> {
    try {
      await this.request<number>(auth, '/logout.php', { method: 'get' });
    } catch (error: unknown | AxiosError) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return;
      }
    }

    throw new HttpAuthorizationError();
  }

  async getAll(auth: AuthToken): Promise<BudgetRecord[]> {
    const { data: dates } = await this.request<ApiRecordsByDay>(auth, '/', {
      method: 'get',
    });

    const records: BudgetRecord[] = Object.values(dates).reduce((acc, day) => {
      if (day.incoming) {
        acc.push(
          ...day.incoming.map((income) =>
            convertToBudgetRecord(income, 'income')
          )
        );
      }

      if (day.goals) {
        acc.push(
          ...day.goals.map((goal) => convertToBudgetRecord(goal, 'expense'))
        );
      }

      return acc;
    }, []);

    return records;
  }

  async updateOrCreate(
    auth: AuthToken,
    record: MakeOptional<BudgetRecord, 'id'>
  ): Promise<BudgetRecord> {
    const type = record.type;

    let requestData: Partial<ApiIncomeRequest | ApiGoalRequest> & {
      create?: 'true';
    };
    let requestPath: string;

    switch (type) {
      case 'income':
        requestData = convertToApiIncome(record);
        requestPath = '/income_save.php';
        break;

      case 'expense':
        requestData = convertToApiGoal(record);
        requestPath = '/goal_save.php';
        break;

      default:
        throw new Error(`Unknown budget record type '${type}'`);
    }

    if (!record.id) {
      requestData.create = 'true';
    }

    const { data } = await this.request<
      ApiIncomeResponse | ApiGoalResponse | number
    >(
      auth,
      requestPath,
      {
        method: 'post',
        data: requestData,
      },
      true
    );

    if (typeof data === 'object') {
      return convertToBudgetRecord(data, record.type);
    }

    processUpdateError(data, record);
  }

  async remove(
    auth: AuthToken,
    id: BudgetRecord['id'],
    type: BudgetRecord['type']
  ): Promise<void> {
    const requestData = { id };
    let requestPath: string;

    switch (type) {
      case 'income':
        requestPath = '/income_delete.php';
        break;

      case 'expense':
        requestPath = '/goal_delete.php';
        break;

      default:
        throw new Error(`Unknown budget record type '${type}'`);
    }

    const { data } = await this.request<number>(
      auth,
      requestPath,
      {
        method: 'post',
        data: requestData,
      },
      true
    );

    switch (data) {
      case 0:
        return;
      case -1:
      case -2:
        throw new Error('Invalid record id');
    }

    throw new Error(`Unknown error code ${data}`);
  }

  private async request<T>(
    auth: AuthToken,
    path: string,
    config: AxiosRequestConfig,
    form = false
  ): Promise<AxiosResponse<T>> {
    const url = `${this.url}${path}`;
    const cookies = `PHPSESSID=${auth.session}; auth_series=${auth.series}; auth_token=${auth.token}`;
    const options = {
      ...config,
      url,
      headers: {
        Cookie: cookies,
        ...config?.headers,
      },
    };

    if (form) {
      return axios.postForm<T>(url, options.data, options);
    }

    return axios.request<T>(options);
  }
}

function convertToBudgetRecord(
  value: ApiIncomeResponse | ApiGoalResponse,
  type: BudgetRecord['type']
): BudgetRecord {
  let dateFrom: number | undefined;
  let dateTo: number | undefined;

  if ('date_from' in value) {
    dateFrom = value.date_from;
  }

  if ('date_to' in value) {
    dateTo = value.date_to;
  }

  if ('date' in value) {
    dateFrom = value.date;
    dateTo = value.date;
  }

  if (!dateFrom || !dateTo) {
    throw new Error('Date is not defined');
  }

  return {
    type,
    id: value.id,
    title: value.label,
    date: {
      from: (dateFrom * 1000) as TimestampInMsec,
      to: (dateTo * 1000) as TimestampInMsec,
    },
    amount: value.amount,
    completed: value.completed,
  };
}

function convertToApiIncome(
  record: MakeOptional<BudgetRecord, 'id'>
): ApiIncomeRequest {
  return {
    id: record.id,
    label: record.title,
    amount: record.amount,
    completed: record.completed,
    date: timestampToIsoDate(record.date.from),
  };
}

function convertToApiGoal(
  record: MakeOptional<BudgetRecord, 'id'>
): ApiGoalRequest {
  return {
    id: record.id,
    label: record.title,
    amount: record.amount,
    completed: record.completed,
    date_from: timestampToIsoDate(record.date.from),
    date_to: timestampToIsoDate(record.date.to),
  };
}

function timestampToIsoDate(timestamp: TimestampInMsec): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function processUpdateError(
  error: number,
  record: MakeOptional<BudgetRecord, 'id'>
): void {
  switch (error) {
    case -1:
      throw createValidationError('id', Joi.number().required());

    case -2:
      throw createValidationError('title', Joi.string().required());

    case -3:
      throw createValidationError('amount', Joi.number().required().min(0));

    case -4:
      throw createValidationError('date.from', Joi.date().required());

    case -5:
      throw createValidationError('date.to', Joi.date().required());

    case -6:
      throw new HttpNotFoundError();

    case -7:
      throw createValidationError('date.to', Joi.date().min(record.date.from));

    default:
      throw new Error(`Unknown error code ${error}`);
  }
}

function createValidationError(field: string, schema: Joi.Schema): Error {
  return fromJoiError(Joi.object({
    'id': schema
  }).validate({}).error, 'body');
}

function processLoginResponse<T>(response: number | T): T {
  if (typeof response === 'number') {
    switch (response) {
      case 0:
        throw new HttpAuthorizationError('Already logged in');
      case -1:
      case -2:
      case -3:
        throw new HttpAuthorizationError('Invalid email or password');
      case -5:
        throw new HttpAuthorizationError('User is not activated');
      case -6:
        throw new HttpAuthorizationError('User is blocked');
      default:
        throw new HttpAuthorizationError();
    }
  }

  return response;
}

export const legacyApi = new LegacyApi(API_URL);
