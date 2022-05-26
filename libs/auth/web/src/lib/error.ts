export class AuthorizationError extends Error {
  constructor(message = 'Authorization required') {
    super(message);
  }
}
