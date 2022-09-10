import { ErrorBase } from '@planner/common-core';
import { t } from 'i18next';
import { HttpValidationError } from './validation';

export interface FormErrors {
  common: Error | undefined;
  fields: FormFieldsErrors;
}

export interface FormFieldsErrors {
  [key: string]: () => string
}

export function getFormErrors(error: Error, form: string): FormErrors {
  const common = error instanceof HttpValidationError
    ? undefined
    : error;

  const fields: FormFieldsErrors = {};

  const validationErrors =
    (error instanceof HttpValidationError && error.validation['body']) ||
    undefined;

  if (validationErrors) {
    for (const field in validationErrors) {
      const error = validationErrors[field];
      const errorPath = getErrorPath(field, form);
      fields[field] = () => translateError(error, errorPath);
    }
  }

  return { common, fields };
}

function getErrorPath(field: string, form: string) {
  const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
  const errorPath = `${form}.${capitalizedField}`;
  return errorPath;
}

export function translateError(error: ErrorBase, errorPath: string): string {
  const params = {
    ...error.context,
    label: t(errorPath),
  };

  return t(`Errors.Messages.${errorPath}.${error.type}`, '', params) ||
    t(`Errors.Common.${error.type}`, error.message, params);
}

