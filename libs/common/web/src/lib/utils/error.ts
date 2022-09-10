import { ErrorBase } from '@planner/common-core';

export class HttpError extends Error implements ErrorBase {
  constructor(message: string, public type: string) {
    super(message);
  }
}

export function fromUnknownError(error: unknown | ErrorBase): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error && error instanceof Object && 'message' in error && 'type' in error) {
    return new HttpError(error['message'], error['type']);
  }

  return new Error((error as string)?.toString());
}
