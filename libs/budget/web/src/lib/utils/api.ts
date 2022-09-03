import { AuthToken } from '@planner/auth-web';
import { BudgetRecord } from '@planner/budget-domain';
import { config, processResponse } from '@planner/common-web';

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
