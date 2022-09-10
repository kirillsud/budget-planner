import { RequestHandler } from 'express';
import { HttpAuthorizationError } from '@planner/common-api';
import { decodeJwt } from './jwt';

export interface AuthToken {
  series: string;
  token: string;
  session: string;
  expire: number;
}

export const guard: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    next(new HttpAuthorizationError());
    return;
  }

  try {
    const payload = decodeJwt<AuthToken>(token);
    res.locals['auth'] = payload;
  } catch (err) {
    next(new HttpAuthorizationError());
    return;
  }

  next();
}
