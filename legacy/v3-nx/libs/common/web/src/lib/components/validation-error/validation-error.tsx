import { useTranslation } from 'react-i18next';
import { ErrorBase } from '../../utils/validation';

export interface ValidationErrorProps {
  param: string;
  error?: ErrorBase;
}

export function ValidationError({ error, param }: ValidationErrorProps) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  const params = {
    ...error.context,
    label: t(param),
  };

  const message =
    t(`Errors.Messages.${param}.${error.type}`, '', params) ||
    t(`Errors.Common.${error.type}`, error.message, params);

  return (
    <span className="root">
      {message}

      <style jsx>{`
        .root {
          color: rgb(174, 0, 29);
          margin: 0.5em;
        }
      `}</style>
    </span>
  );
}

export default ValidationError;
