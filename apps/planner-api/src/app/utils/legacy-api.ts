import { BudgetRecord } from '@planner/budget-domain';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthorizationError } from '../errors/authorization.error';
import { AuthToken } from '../middleware/auth';

export interface ApiIncome {
  id: number;
  date_from: number;
  date_to: number;
  label: string;
  amount: number;
  completed: boolean;
}

export interface ApiGoal {
  id: number;
  date: number;
  label: string;
  amount: number;
  completed: boolean;
}

export interface ApiDayRecords {
  incomes?: ApiIncome[];
  goals?: ApiGoal[];
}

export type ApiRecordsByDay = Record<number, ApiDayRecords>;

export class LegacyApi {
  constructor(private readonly url: string) {
  }

  async login(email: string, password: string, remember: boolean): Promise<AuthToken> {
    const { data } = await axios.postForm<AuthToken | number>(`${this.url}/auth.php`, {
      email,
      password,
      remember: remember ? 'on' : 'off',
    });

    if (typeof data === 'number') {
      const message = data === -3 ? 'Invalid email or password' : undefined;
      throw new AuthorizationError(message);
    }

    return data;
  }

  async logout(auth: AuthToken): Promise<void> {
    try {
      await this.request<number>(auth, '/logout.php', { method: 'get' });
    } catch (error: unknown | AxiosError) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return;
      }
    }

    throw new AuthorizationError();
  }

  async getIncomes(auth: AuthToken): Promise<BudgetRecord[]> {
    return this.loadRecords(auth, 'income');
  }

  async getExpenses(auth: AuthToken): Promise<BudgetRecord[]> {
    return this.loadRecords(auth, 'expense');
  }

  private async loadRecords(auth: AuthToken, type: BudgetRecord['type']): Promise<BudgetRecord[]> {
    const { data: dates } = await this.request<ApiRecordsByDay>(auth, '/', { method: 'get' });

    const apiType = 'income' === type ? 'incoming' : 'goals';

    const records: BudgetRecord[] = Object
      .values(dates)
      .reduce((acc, day) => [...acc, ...(day[apiType] ?? [])], [])
      .map(x => this.convertApiRecordToPublic(x, type));

    return records;
  }

  private async request<T>(auth: AuthToken, path: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const cookies = `PHPSESSID=${auth.session}; auth_series=${auth.series}; auth_token=${auth.token}`;
    const options = {
      ...config,
      url: `${this.url}${path}`,
      headers: {
        'Cookie': cookies,
        ...config?.headers
      },
    };

    return axios.request<T>(options);
  }

  private convertApiRecordToPublic(value: ApiIncome | ApiGoal, type: BudgetRecord['type']): BudgetRecord {
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
        from: dateFrom,
        to: dateTo,
      },
      amount: value.amount,
      completed: value.completed,
    };
  }

  private timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }
}
