import { HttpError } from './http.error';

export class HttpNotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}
