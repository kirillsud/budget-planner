import { UNKNOWN_ERROR } from '@planner/common-core';
import { isCelebrateError } from 'celebrate';
import * as express from 'express';
import { environment } from '../../environments/environment';
import {
  fromCelebrateError,
  HttpValidationError,
  HttpError,
} from '@planner/common-api';

export function error(
  error: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (isCelebrateError(error)) {
    error = fromCelebrateError(error);
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const type = error instanceof HttpError ? error.type : UNKNOWN_ERROR;
  const message = error instanceof HttpError ? error.message : 'Unknown error';
  const validation = error instanceof HttpValidationError ? error.errors : undefined;
  const debug = statusCode === 500 && !environment.production
      ? error.toString()
    : undefined;

  if (!(error instanceof HttpError)) {
    console.log(error);
  }

  res.status(statusCode).send({ message, type, debug, validation });

  next();
}
