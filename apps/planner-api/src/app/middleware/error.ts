import * as express from 'express';
import { environment } from '../../environments/environment';
import { HttpError } from '../errors/http.error';

export function error(
  error: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = error instanceof HttpError ? error.message : 'Internal server error';
  const debug = statusCode === 500 && !environment.production ? error.toString() : undefined;

  console.log(error);

  res
    .status(statusCode)
    .send({ message, debug, statusCode });

  next();
}
