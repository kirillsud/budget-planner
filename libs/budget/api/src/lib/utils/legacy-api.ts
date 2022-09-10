import * as Joi from 'joi';
import { API_URL, HttpNotFoundError, fromJoiError } from '@planner/common-api';
import { AuthToken, LegacyApi as AuthLegacyApi } from '@planner/auth-api';
import { BudgetRecord, TimestampInMsec } from '@planner/budget-core';

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

interface ApiIncomeRequest extends MakeOptional<ApiRecord, 'id'> {
  date: string;
}

interface ApiGoalRequest extends MakeOptional<ApiRecord, 'id'> {
  date_from: string;
  date_to: string;
}

interface ApiDayRecords {
  incoming?: ApiIncomeResponse[];
  goals?: ApiGoalResponse[];
}

type ApiRecordsByDay = Record<number, ApiDayRecords>;

export class LegacyApi extends AuthLegacyApi {
  constructor(url: string) {
    super(url);
  }

  async getAll(auth: AuthToken): Promise<BudgetRecord[]> {
    const { data: dates } = await this.request<ApiRecordsByDay>(auth, '/', {
      method: 'get',
    });

    const records: BudgetRecord[] = Object.values(dates).reduce<BudgetRecord[]>((acc, day) => {
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

    throw processUpdateError(data, record);
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
): Error {
  switch (error) {
    case -1:
      return createValidationError('id', Joi.number().required());

    case -2:
      return createValidationError('title', Joi.string().required());

    case -3:
      return createValidationError('amount', Joi.number().required().min(0));

    case -4:
      return createValidationError('date.from', Joi.date().required());

    case -5:
      return createValidationError('date.to', Joi.date().required());

    case -6:
      return new HttpNotFoundError();

    case -7:
      return createValidationError('date.to', Joi.date().min(record.date.from));

    default:
      return new Error(`Unknown error code ${error}`);
  }
}

function createValidationError(field: string, schema: Joi.Schema): Error {
  const error = Joi.object({ [field]: schema })
    .validate({})
    .error;

  if (!error) {
    throw new Error('Validation error is not created');
  }

  return fromJoiError(error, 'body');
}

export const legacyApi = new LegacyApi(API_URL);
