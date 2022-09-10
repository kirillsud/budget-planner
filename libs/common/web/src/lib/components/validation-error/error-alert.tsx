import Alert from '@mui/material/Alert';
import { ErrorBase } from '@planner/common-core';
import { useTranslation } from 'react-i18next';

export interface ErrorAlertProps {
  param: string;
  error?: Error | ErrorBase;
}

export function ErrorAlert({ error, param }: ErrorAlertProps) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  const errorType = 'type' in error ? error.type : 'unknown';
  const context = ('context' in error && error.context) || {};

  context['label'] = t(param);

  const message =
    (param && t(`Errors.Messages.${param}.${errorType}`, '', context)) ||
    t(`Errors.Common.${errorType}`, error.message, context);

  return <Alert severity="error">{message}</Alert>;
}

export default ErrorAlert;
