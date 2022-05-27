import { AuthToken } from '@planner/auth-web';
import { BudgetRecord } from '@planner/budget-domain';
import { config, HttpValidationError } from '@planner/common-web';

const { apiUrl } = config();

export async function fetchRecords(auth: AuthToken): Promise<BudgetRecord[]> {
  const response = await fetch(`${apiUrl}/budget`, {
    headers: requestHeaders(auth),
  });

  return processResponse<BudgetRecord[]>(response);
}

export async function createRecord(
  record: Omit<BudgetRecord, 'id' | 'completed'>,
  auth: AuthToken
): Promise<BudgetRecord> {
  const response = await fetch(`${apiUrl}/budget`, {
    method: 'PUT',
    body: JSON.stringify(record),
    headers: requestHeaders(auth),
  });

  return processResponse<BudgetRecord>(response);
}

export async function updateRecord(
  record: BudgetRecord,
  auth: AuthToken
): Promise<BudgetRecord> {
  const response = await fetch(`${apiUrl}/budget/${record.id}`, {
    method: 'POST',
    body: JSON.stringify({
      type: record.type,
      amount: record.amount,
      title: record.title,
      date: {
        from: record.date.from,
        to: record.date.to,
      },
    }),
    headers: requestHeaders(auth),
  });

  return processResponse<BudgetRecord>(response);
}

export async function removeRecord(
  id: number,
  type: BudgetRecord['type'],
  authToken: AuthToken
): Promise<void> {
  const response = await fetch(`${apiUrl}/budget/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ type }),
    headers: requestHeaders(authToken),
  });

  return processResponse<void>(response);
}

function requestHeaders(auth: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: auth,
  };
}

async function processResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return undefined as any as T;
  }

  const data: T | Error | HttpValidationError = await response.json();

  if (response.status >= 200 && response.status < 300) {
    return data as T;
  }

  const message = ('message' in data && data.message) || 'Unknown error';

  let error: Error | HttpValidationError;

  if ('validation' in data) {
    error = new HttpValidationError(data.validation);
  } else {
    error = new Error(message);
  }

  throw error;
}
