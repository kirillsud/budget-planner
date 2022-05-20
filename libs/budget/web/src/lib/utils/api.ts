import { AuthToken } from '@planner/auth-web';
import { BudgetRecord } from '@planner/budget-domain';
import { config, HttpValidationError } from '@planner/common-web';

const { apiUrl } = config();

export async function fetchRecords(auth: AuthToken): Promise<BudgetRecord[]> {
  return await fetch(`${apiUrl}/budget`, {
    headers: {
      Authorization: auth,
    },
  }).then((_) => _.json());
}

export async function createRecord(record: Omit<BudgetRecord, 'id' | 'completed'>, auth: AuthToken): Promise<BudgetRecord> {
  const response = await fetch(`${apiUrl}/budget`, {
    method: 'PUT',
    body: JSON.stringify(record),
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
  });

  const data: BudgetRecord | HttpValidationError = await response.json();

  if (response.status === 200 && 'id' in data) {
    return data;
  }

  const error = {
    validation: 'validation' in data ? data.validation : {},
    message: 'message' in data && data.message || 'Unknown error',
  };

  throw error;
}

export async function updateRecord(id: number, type: BudgetRecord['type'], changes: Partial<BudgetRecord>, auth: AuthToken): Promise<BudgetRecord> {
  const response = await fetch(`${apiUrl}/budget/${id}`, {
    method: 'POST',
    body: JSON.stringify({
      type,
      ...changes,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
  });

  const data: BudgetRecord | HttpValidationError = await response.json();

  if (response.status === 200 && 'id' in data) {
    return data;
  }

  const error = {
    validation: 'validation' in data ? data.validation : {},
    message: 'message' in data && data.message || 'Unknown error',
  };

  throw error;
}