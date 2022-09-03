import { ErrorBase } from '@planner/common/core';

export class HttpError extends Error implements ErrorBase {
  readonly type: ErrorBase['type'];

  constructor(
    public readonly statusCode: number,
    message?: string,
    type?: ErrorBase['type'],
  ) {
    super(message);
    this.type = type || statusCode.toString(10);
  }
}
