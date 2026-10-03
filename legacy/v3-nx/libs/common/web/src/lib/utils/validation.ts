import { Context } from 'joi';

export type SourceType =
  | 'params'
  | 'headers'
  | 'query'
  | 'cookies'
  | 'signedCookies'
  | 'body';

// TODO: move to common library for api and web apps
export class HttpValidationError extends Error {
  constructor(public validation: ValidationErrors) {
    super('Validation error');
  }
}

export interface ValidationErrors {
  [type: string]: {
    [path: string]: ErrorBase;
  };
}

export interface ErrorBase {
  message: string;
  type: string;
  context: Context;
}
