import * as jwt from 'jsonwebtoken';

const { NODE_ENV, JWT_SECRET } = process.env;

const jwtSecret = NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret';

export function generateJwt<T>(payload: T): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: 3600000 * 24 * 7 });
}

export function decodeJwt<T>(token: string): T {
  return jwt.verify(token, jwtSecret);
}
