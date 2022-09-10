import { ErrorBase, UNKNOWN_ERROR } from '@planner/common-core';
import { HttpError } from './error';
import { HttpValidationError } from './validation';

export async function processResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return undefined as any as T;
  }

  const data: T | Error | ErrorBase | HttpValidationError = await response.json();

  if (response.status >= 200 && response.status < 300) {
    return data as T;
  }

  const message = ('message' in data && data.message) || 'Unknown error';
  const errorType = ('type' in data && data.type) || UNKNOWN_ERROR;

  let error: Error | HttpValidationError;

  if ('validation' in data) {
    error = new HttpValidationError(data.validation);
  } else {
    error = new HttpError(message, errorType);
  }

  throw error;
}