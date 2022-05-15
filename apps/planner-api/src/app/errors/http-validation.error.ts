import { CelebrateError } from 'celebrate';
import { ValidationError as JoiValidationError, ValidationErrorItem } from 'joi'

export interface ValidationError {
  location: 'params' | 'headers' | 'query' | 'cookies' | 'signedCookies' | 'body',
  param: string;
  value: unknown;
  msg: string;
}

export class HttpValidationError extends CelebrateError {
  constructor(
    errors: ValidationError[],
    message?: string,
  ) {
    super(message, { celebrated: true });
    this.details = new Map();

    errors.forEach(error => {
      const joiError = new JoiValidationError(
        error.msg,
        [{
          message: '',
          path: error.param.split('.'),
          context: {
            value: error.value,
          }
        } as ValidationErrorItem],
        null,
      );

      this.details.set(error.location, joiError);
    });
  }
}
