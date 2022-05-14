import { HttpError } from './http.error';

export class AuthorizationError extends HttpError {
  constructor(message = 'Authorization required') {
    super(401, message);
  }
}
