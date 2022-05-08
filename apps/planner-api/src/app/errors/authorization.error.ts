import { HttpError } from './http.error';

export class AuthorizationError extends HttpError {
  constructor() {
    super(401, 'Authorization required');
  }
}
