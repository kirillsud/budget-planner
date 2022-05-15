import { HttpError } from './http.error';

export class HttpAuthorizationError extends HttpError {
  constructor(message = 'Authorization required') {
    super(401, message);
  }
}
