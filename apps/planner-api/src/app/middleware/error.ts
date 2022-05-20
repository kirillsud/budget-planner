import { isCelebrateError } from 'celebrate';
import * as express from 'express';
import { environment } from '../../environments/environment';
import { fromCelebrateError, HttpValidationError } from '../errors/http-validation.error';
import { HttpError } from '../errors/http.error';

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
  const message = error instanceof HttpError ? error.message : 'Internal server error';
  const debug = statusCode === 500 && !environment.production ? error.toString() : undefined;
  const validation = error instanceof HttpValidationError ? error.errors : undefined;

  if (!(error instanceof HttpError)) {
    console.log(error);
  }

  res
    .status(statusCode)
    .send({ message, debug, validation });

  next();
}
