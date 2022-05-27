import { Request } from 'express';
import { decodeJwt } from '../utils/jwt';
import { HttpAuthorizationError } from '../errors/http-authorization.error';

export interface AuthToken {
  series: string;
  token: string;
  session: string;
  expire: Date;
}

export interface AuthRequest extends Request {
  auth: AuthToken;
}

export function auth(req: AuthRequest, _res, next) {
  const token = req.headers.authorization;

  if (!token) {
    next(new HttpAuthorizationError());
    return;
  }

  try {
    const payload = decodeJwt<AuthToken>(token);
    req.auth = payload;
  } catch (err) {
    next(new HttpAuthorizationError());
    return;
  }

  next();
}
