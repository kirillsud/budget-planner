import { CelebrateError } from 'celebrate';
import { HttpError } from './http.error';

type ValidationLocation = 'params' | 'headers' | 'query' | 'cookies' | 'signedCookies' | 'body';

export type ErrorBase = {
  message: string;
  value: unknown;
}

export interface ValidationError extends ErrorBase {
  location: ValidationLocation,
  param: string;
}

export class HttpValidationError extends HttpError {

  public errors: {[location: string]: {[path: string]: ErrorBase}} = {};

  constructor(
    errors: ValidationError[],
    message = 'Validation error',
  ) {
    super(400, message);

    errors.forEach(error => {
      const location = error.location as string;
      const locationErrors = this.errors[location] ?? {};

      locationErrors[error.param] = {
        message: error.message,
        value: error.value,
      };

      this.errors[error.location] = locationErrors;
    });
  }
}

export function fromCelebrateError(error: CelebrateError): HttpValidationError {
  const errors: ValidationError[] = [];
  
  for (const [segment, joiError] of error.details) {
    errors.push(...joiError.details.map(detail => ({
      location: segment as ValidationLocation,
      param: detail.path.join('.'),
      value: detail.context.value,
      message: detail.message,
    })));
  }

  return new HttpValidationError(errors);
}
