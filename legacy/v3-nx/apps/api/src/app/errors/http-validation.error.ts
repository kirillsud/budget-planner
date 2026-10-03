import { CelebrateError } from 'celebrate';
import { HttpError } from './http.error';
import * as Joi from 'joi';

type ValidationLocation =
  | 'params'
  | 'headers'
  | 'query'
  | 'cookies'
  | 'signedCookies'
  | 'body';

export type ErrorBase = {
  type: string;
  message: string;
  context: Joi.Context;
};

export interface ValidationError extends ErrorBase {
  location: ValidationLocation;
  param: string;
}

export class HttpValidationError extends HttpError {
  public errors: { [location: string]: { [path: string]: ErrorBase } } = {};

  constructor(errors: ValidationError[], message = 'Validation error') {
    super(400, message);

    errors.forEach((error) => {
      const location = error.location as string;
      const locationErrors = this.errors[location] ?? {};

      locationErrors[error.param] = {
        message: error.message,
        type: error.type,
        context: error.context,
      };

      this.errors[error.location] = locationErrors;
    });
  }
}

export function fromCelebrateError(error: CelebrateError): HttpValidationError {
  const errors: ValidationError[] = [];

  for (const [segment, joiError] of error.details) {
    errors.push(...joiErrorToValidationErrors(joiError, segment as ValidationLocation));
  }

  return new HttpValidationError(errors);
}

export function fromJoiError(joiError: Joi.ValidationError, location: ValidationLocation): HttpValidationError {
  const errors: ValidationError[] = joiErrorToValidationErrors(joiError, location);
  return new HttpValidationError(errors);
}

function joiErrorToValidationErrors(joiError: Joi.ValidationError, location: ValidationLocation): ValidationError[] {
  return joiError.details
    .map((detail) => ({
      location,
      param: detail.path.join('.'),
      context: detail.context,
      type: detail.type,
      message: detail.message,
    } as ValidationError));
}
