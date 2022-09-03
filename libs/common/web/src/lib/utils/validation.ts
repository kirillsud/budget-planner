import { ErrorBase } from '@planner/common/core';
import { t } from 'i18next';

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

export function translateError(error: ErrorBase, field: string): string {
  const params = {
    ...error.context,
    label: t(field),
  };

  return t(`Errors.Messages.${field}.${error.type}`, '', params) ||
    t(`Errors.Common.${error.type}`, error.message, params);
}
